const { query } = require('../config/database');

// GET /organizations/:orgId
const getOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (req.user.role !== 'superadmin' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await query(
      `SELECT o.*,
              COUNT(DISTINCT u.id) FILTER (WHERE u.is_active) as active_users,
              COUNT(DISTINCT u.id) as total_users
       FROM organizations o
       LEFT JOIN users u ON u.organization_id = o.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [orgId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Organización no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener organización' });
  }
};

// PATCH /organizations/:orgId
const updateOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, city, contact_email, contact_phone } = req.body;

    if (req.user.role !== 'superadmin' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (city !== undefined) { fields.push(`city = $${idx++}`); values.push(city); }
    if (contact_email !== undefined) { fields.push(`contact_email = $${idx++}`); values.push(contact_email); }
    if (contact_phone !== undefined) { fields.push(`contact_phone = $${idx++}`); values.push(contact_phone); }

    if (!fields.length) return res.status(400).json({ error: 'Nada que actualizar' });

    fields.push(`updated_at = NOW()`);
    values.push(orgId);

    const result = await query(
      `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar organización' });
  }
};

// GET /organizations/:orgId/stats
const getStats = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (req.user.role !== 'superadmin' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Visibilidad de actividad reciente / consumo por módulo:
    // - admin_centro y superadmin ven toda la org.
    // - profesor ve solo lo que él mismo ha generado. El criterio "módulos
    //   asignados" se cumple por construcción: requireModuleActive impide
    //   ejecutar tools de módulos no asignados, así que el conjunto de
    //   usage_logs.user_id = req.user.id ya está acotado a esos módulos.
    const isProfesor = req.user.role === 'profesor';
    const ownerFilter = isProfesor ? ' AND ul.user_id = $2' : '';
    const ownerParams = isProfesor ? [orgId, req.user.id] : [orgId];

    const [usersResult, usageResult, recentResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FILTER (WHERE is_active) as active_users,
                COUNT(*) as total_users
         FROM users WHERE organization_id = $1`,
        [orgId]
      ),
      query(
        `SELECT ul.module, ul.action_type, COUNT(*) as count
         FROM usage_logs ul
         WHERE ul.organization_id = $1
           AND ul.created_at >= NOW() - INTERVAL '30 days'
           ${ownerFilter}
         GROUP BY ul.module, ul.action_type
         ORDER BY count DESC`,
        ownerParams
      ),
      query(
        `SELECT ul.action_type, ul.module, ul.created_at,
                u.name as user_name
         FROM usage_logs ul
         JOIN users u ON ul.user_id = u.id
         WHERE ul.organization_id = $1
           ${ownerFilter}
         ORDER BY ul.created_at DESC
         LIMIT 10`,
        ownerParams
      ),
    ]);

    // Agregados para la página /dashboard/stats. Todo viene de usage_logs.
    // El módulo "real" vive en metadata->>'moduleId' para las tools del
    // catálogo Fase 1 (porque module es un enum legacy hardcodeado a
    // 'cambridge'). Para Cambridge nativo, metadata.moduleId no existe y
    // usamos module::text.
    // Categorización de action_type → exámenes / correcciones / dinámicas
    // se hace por LIKE; es heurística pero estable con el catálogo actual.
    const realModuleExpr = `COALESCE(metadata->>'moduleId', module::text)`;
    const categoryExpr = `CASE
        WHEN action_type ILIKE '%correct%' OR action_type ILIKE '%ocr%' THEN 'corrections'
        WHEN action_type ILIKE '%dynamic%' OR action_type ILIKE '%dinamic%' THEN 'dynamics'
        ELSE 'exams'
      END`;

    const [totalsResult, weeklyResult, moduleBreakResult, byTeacherResult, modulesCatalogResult] = await Promise.all([
      // Totales del mes en curso + mes anterior (para delta).
      query(
        `SELECT
           COUNT(*) FILTER (WHERE ul.created_at >= date_trunc('month', NOW()))::int AS current_month,
           COUNT(*) FILTER (
             WHERE ul.created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
               AND ul.created_at <  date_trunc('month', NOW())
           )::int AS previous_month
         FROM usage_logs ul
         WHERE ul.organization_id = $1 ${ownerFilter}`,
        ownerParams
      ),
      // Uso por semana del mes en curso (semana 1 a 5 según el día del mes).
      query(
        `SELECT
           LEAST(5, CEIL(EXTRACT(DAY FROM ul.created_at)::int / 7.0))::int AS week,
           COUNT(*)::int AS count
         FROM usage_logs ul
         WHERE ul.organization_id = $1
           AND ul.created_at >= date_trunc('month', NOW())
           ${ownerFilter}
         GROUP BY week
         ORDER BY week`,
        ownerParams
      ),
      // Uso por módulo (mes en curso). Usa el moduleId real cuando lo hay.
      query(
        `SELECT ${realModuleExpr} AS module_id, COUNT(*)::int AS count
         FROM usage_logs ul
         WHERE ul.organization_id = $1
           AND ul.created_at >= date_trunc('month', NOW())
           ${ownerFilter}
         GROUP BY module_id
         ORDER BY count DESC
         LIMIT 8`,
        ownerParams
      ),
      // Desglose por profesor del centro (mes en curso) con categorías.
      query(
        `SELECT
           u.id, u.name,
           COUNT(*) FILTER (WHERE ${categoryExpr} = 'exams')::int       AS exams,
           COUNT(*) FILTER (WHERE ${categoryExpr} = 'corrections')::int AS corrections,
           COUNT(*) FILTER (WHERE ${categoryExpr} = 'dynamics')::int    AS dynamics,
           COUNT(*)::int AS total
         FROM usage_logs ul
         JOIN users u ON u.id = ul.user_id
         WHERE ul.organization_id = $1
           AND ul.created_at >= date_trunc('month', NOW())
           ${ownerFilter}
         GROUP BY u.id, u.name
         ORDER BY total DESC
         LIMIT 12`,
        ownerParams
      ),
      // Nombres legibles del catálogo para mostrar en la breakdown / top.
      query(`SELECT id, name FROM modules`),
    ]);

    const moduleNameById = Object.fromEntries(
      modulesCatalogResult.rows.map((m) => [m.id, m.name])
    );
    const labelFor = (id) => moduleNameById[id] || id;

    const breakdown = moduleBreakResult.rows.map((r) => ({
      module_id: r.module_id,
      label: labelFor(r.module_id),
      count: r.count,
    }));

    const teacherStats = byTeacherResult.rows;
    const totals = totalsResult.rows[0] || { current_month: 0, previous_month: 0 };
    const deltaPct = totals.previous_month > 0
      ? Math.round(((totals.current_month - totals.previous_month) / totals.previous_month) * 100)
      : null;

    // Heurística: cada generación ahorra ~15 minutos de trabajo manual.
    const hoursSaved = Math.round(totals.current_month * 0.25);

    const topTeacher = teacherStats[0] || null;
    const topModule = breakdown[0] || null;

    res.json({
      users: usersResult.rows[0],
      usageByModule: usageResult.rows,
      recentActivity: recentResult.rows,
      // Bloques específicos de /dashboard/stats:
      monthly: {
        current_month:  totals.current_month,
        previous_month: totals.previous_month,
        delta_pct:      deltaPct,
        hours_saved:    hoursSaved,
      },
      weeklyUsage: weeklyResult.rows, // [{ week: 1..5, count }]
      moduleBreakdown: breakdown,     // [{ module_id, label, count }]
      teacherStats,                   // [{ id, name, exams, corrections, dynamics, total }]
      topTeacher: topTeacher ? { id: topTeacher.id, name: topTeacher.name, total: topTeacher.total } : null,
      topModule:  topModule  ? { id: topModule.module_id, label: topModule.label, count: topModule.count } : null,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// PATCH /organizations/:orgId/modules — toggle modules (admin only)
const updateModules = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { activeModules } = req.body;

    if (req.user.role !== 'superadmin' && req.user.role !== 'admin_centro') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    if (req.user.role === 'admin_centro' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const validModules = ['cambridge', 'espanol', 'matematicas', 'medio', 'oposiciones'];
    const filtered = activeModules.filter((m) => validModules.includes(m));

    const result = await query(
      `UPDATE organizations SET active_modules = $1, updated_at = NOW() WHERE id = $2 RETURNING active_modules`,
      [filtered, orgId]
    );

    res.json({ activeModules: result.rows[0].active_modules });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar módulos' });
  }
};

// ── SUPERADMIN ONLY ──────────────────────────────────────────

// GET /superadmin/organizations
const getAllOrgs = async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '', status } = req.query;
    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    let where = `WHERE ($1 = '%%' OR o.name ILIKE $1 OR o.city ILIKE $1)`;
    const values = [searchParam];
    let idx = 2;

    if (status) {
      where += ` AND o.is_active = $${idx}`;
      values.push(status === 'active');
      idx++;
    }

    values.push(limit, offset);

    const result = await query(
      `SELECT o.id, o.name, o.city, o.plan, o.active_modules, o.is_active,
              o.stripe_customer_id, o.created_at,
              COUNT(DISTINCT u.id) FILTER (WHERE u.is_active) as active_users,
              COUNT(DISTINCT ul.id) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '30 days') as monthly_usage
       FROM organizations o
       LEFT JOIN users u ON u.organization_id = o.id AND u.role != 'superadmin'
       LEFT JOIN usage_logs ul ON ul.organization_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM organizations o ${where}`,
      values.slice(0, -2)
    );

    res.json({
      organizations: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) {
    console.error('getAllOrgs error:', err);
    res.status(500).json({ error: 'Error al obtener organizaciones' });
  }
};

// PATCH /superadmin/organizations/:orgId
const superadminUpdateOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { plan, is_active, active_modules } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (plan) { fields.push(`plan = $${idx++}`); values.push(plan); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
    if (active_modules) { fields.push(`active_modules = $${idx++}`); values.push(active_modules); }

    if (!fields.length) return res.status(400).json({ error: 'Nada que actualizar' });

    fields.push(`updated_at = NOW()`);
    values.push(orgId);

    const result = await query(
      `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar organización' });
  }
};

// GET /superadmin/stats
const getSuperadminStats = async (req, res) => {
  try {
    const [orgsResult, usersResult, usageResult, revenueResult] = await Promise.all([
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active) as active FROM organizations`),
      query(`SELECT COUNT(*) as total FROM users WHERE role != 'superadmin' AND is_active = true`),
      query(
        `SELECT COUNT(*) as total_calls,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as monthly_calls
         FROM usage_logs`
      ),
      query(
        `SELECT plan, COUNT(*) as count FROM organizations WHERE is_active = true GROUP BY plan`
      ),
    ]);

    res.json({
      organizations: orgsResult.rows[0],
      users: usersResult.rows[0],
      usage: usageResult.rows[0],
      planBreakdown: revenueResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = {
  getOrg,
  updateOrg,
  getStats,
  updateModules,
  getAllOrgs,
  superadminUpdateOrg,
  getSuperadminStats,
};
