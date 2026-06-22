// Digest semanal y aviso de profes inactivos. Se ejecuta desde
// backend/src/jobs/weeklyDigest.js — un proceso PM2 separado con cron.
//
// Resumen para cada organización activa con admins:
//   - Recursos generados últimos 7 días
//   - Profesores activos últimos 7 días (con al menos 1 uso)
//   - Top 3 herramientas más usadas
//   - Profesores inactivos ≥ 14 días → notificación TEACHER_INACTIVE aparte
//
// También limpia notificaciones leídas > 90 días.

const { query } = require('../config/database');
const { notify, notifyRole, wasRecentlyNotified, TYPES } = require('./notifyService');

const DAYS_INACTIVE = 14;
const RETENTION_DAYS = 90;

const listActiveOrgs = async () => {
  const { rows } = await query(
    `SELECT id, name, plan FROM organizations WHERE is_active = true`
  );
  return rows;
};

const collectOrgStats = async (orgId) => {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM library_items
         WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '7 days') AS resources_count,
       (SELECT COUNT(DISTINCT user_id)::int FROM usage_logs
         WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '7 days') AS active_teachers,
       (SELECT COUNT(*)::int FROM users
         WHERE organization_id = $1 AND role = 'profesor' AND is_active = true) AS total_teachers`,
    [orgId]
  );

  const top = await query(
    `SELECT tool_key, COUNT(*)::int AS uses
       FROM usage_logs
      WHERE organization_id = $1
        AND tool_key IS NOT NULL
        AND created_at >= NOW() - INTERVAL '7 days'
   GROUP BY tool_key
   ORDER BY uses DESC
      LIMIT 3`,
    [orgId]
  );

  return { ...rows[0], top_tools: top.rows };
};

const buildDigestBody = (stats) => {
  const parts = [
    `${stats.resources_count} recursos generados`,
    `${stats.active_teachers}/${stats.total_teachers} profesores activos`,
  ];
  if (stats.top_tools?.length) {
    parts.push(`Top: ${stats.top_tools.map((t) => t.tool_key).join(', ')}`);
  }
  return parts.join(' · ');
};

const sendOrgDigest = async (org) => {
  const stats = await collectOrgStats(org.id);
  // Si no hubo NADA esta semana, no enviamos digest (evita ruido en orgs
  // recién creadas o vacías).
  if (stats.resources_count === 0 && stats.active_teachers === 0) return false;

  await notifyRole({
    organizationId: org.id,
    role: 'admin_centro',
    type: TYPES.WEEKLY_DIGEST,
    title: `Resumen semanal — ${stats.resources_count} recursos · ${stats.active_teachers} profesores activos`,
    body: buildDigestBody(stats),
    link: '/dashboard/stats',
    metadata: {
      window_days: 7,
      ...stats,
    },
  });
  return true;
};

// Profes con last_login < NOW() - 14 días (o nunca, pero solo si llevan más
// de 14 días creados) → notificación a los admins de su centro.
const findInactiveTeachers = async (orgId) => {
  const { rows } = await query(
    `SELECT id, name, email, last_login
       FROM users
      WHERE organization_id = $1
        AND role = 'profesor'
        AND is_active = true
        AND (
          (last_login IS NOT NULL AND last_login < NOW() - ($2 || ' days')::INTERVAL)
          OR
          (last_login IS NULL AND created_at < NOW() - ($2 || ' days')::INTERVAL)
        )`,
    [orgId, String(DAYS_INACTIVE)]
  );
  return rows;
};

const notifyInactiveTeachers = async (org) => {
  const inactive = await findInactiveTeachers(org.id);
  if (!inactive.length) return 0;

  // Probe: si ya avisamos al admin sobre este profe en los últimos 14 días,
  // no repetimos. Comprobación por cada profe inactivo individualmente.
  const probe = await query(
    `SELECT id FROM users WHERE organization_id = $1 AND role = 'admin_centro' AND is_active = true LIMIT 1`,
    [org.id]
  );
  const adminProbeId = probe.rows[0]?.id;
  if (!adminProbeId) return 0;

  let sent = 0;
  for (const t of inactive) {
    const already = await wasRecentlyNotified({
      userId: adminProbeId,
      type: TYPES.TEACHER_INACTIVE,
      metadataMatch: { teacherId: t.id },
      withinHours: DAYS_INACTIVE * 24,
    });
    if (already) continue;

    await notifyRole({
      organizationId: org.id,
      role: 'admin_centro',
      type: TYPES.TEACHER_INACTIVE,
      title: `${t.name} lleva ${DAYS_INACTIVE}+ días sin entrar`,
      body: t.last_login
        ? `Última conexión: ${new Date(t.last_login).toLocaleDateString('es')}.`
        : 'Aún no ha hecho su primer login.',
      link: '/dashboard/users',
      metadata: { teacherId: t.id, lastLogin: t.last_login },
    });
    sent += 1;
  }
  return sent;
};

const pruneOldNotifications = async () => {
  try {
    const { rowCount } = await query(
      `DELETE FROM notifications
        WHERE read_at IS NOT NULL
          AND created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [String(RETENTION_DAYS)]
    );
    return rowCount;
  } catch (err) {
    console.warn('pruneOldNotifications failed (non-fatal):', err.message);
    return 0;
  }
};

const runWeeklyDigest = async () => {
  const orgs = await listActiveOrgs();
  let digestsSent = 0;
  let inactiveAlerts = 0;
  for (const org of orgs) {
    try {
      if (await sendOrgDigest(org)) digestsSent += 1;
      inactiveAlerts += await notifyInactiveTeachers(org);
    } catch (err) {
      console.warn(`digest for org ${org.id} failed (non-fatal):`, err.message);
    }
  }
  const pruned = await pruneOldNotifications();
  return { orgs: orgs.length, digestsSent, inactiveAlerts, pruned };
};

module.exports = { runWeeklyDigest, sendOrgDigest, notifyInactiveTeachers, pruneOldNotifications };
