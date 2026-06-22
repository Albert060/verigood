const { query } = require('../config/database');
const { invalidateOrgModules, invalidateUserModules } = require('../middleware/auth');
const { notify, TYPES } = require('../services/notifyService');

// GET /api/modules — catálogo público
const listCatalog = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, stage, category, icon, route_prefix, sort_order, metadata
       FROM modules
       WHERE is_available = true
       ORDER BY stage, sort_order, name`
    );
    res.json({ modules: result.rows });
  } catch (err) {
    console.error('listCatalog error:', err);
    res.status(500).json({ error: 'Error al obtener catálogo de módulos' });
  }
};

// GET /api/organizations/:orgId/modules
// Para admin_centro / superadmin: todos los módulos activos del centro.
// Para profesor: solo los activos del centro Y asignados a su usuario
// (intersección con user_modules). Así la sidebar y el catálogo institucional
// reflejan automáticamente lo que el admin haya asignado.
const listOrgModules = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (req.user.role !== 'superadmin' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const isProfesor = req.user.role === 'profesor';
    const sql = isProfesor
      ? `SELECT m.id, m.name, m.stage, m.category, m.icon, m.route_prefix,
                m.sort_order, m.metadata, om.activated_at
         FROM organization_modules om
         JOIN modules m       ON m.id = om.module_id
         JOIN user_modules um ON um.module_id = om.module_id AND um.user_id = $2
         WHERE om.organization_id = $1
         ORDER BY m.stage, m.sort_order, m.name`
      : `SELECT m.id, m.name, m.stage, m.category, m.icon, m.route_prefix,
                m.sort_order, m.metadata, om.activated_at
         FROM organization_modules om
         JOIN modules m ON m.id = om.module_id
         WHERE om.organization_id = $1
         ORDER BY m.stage, m.sort_order, m.name`;

    const params = isProfesor ? [orgId, req.user.id] : [orgId];
    const result = await query(sql, params);
    res.json({ modules: result.rows });
  } catch (err) {
    console.error('listOrgModules error:', err);
    res.status(500).json({ error: 'Error al obtener módulos de la organización' });
  }
};

// POST /api/organizations/:orgId/modules/:moduleId/activate
const activateModule = async (req, res) => {
  try {
    const { orgId, moduleId } = req.params;
    if (req.user.role !== 'superadmin' &&
        (req.user.role !== 'admin_centro' || req.user.organization_id !== orgId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { rows: [mod] } = await query(
      `SELECT id FROM modules WHERE id = $1 AND is_available = true`,
      [moduleId]
    );
    if (!mod) return res.status(404).json({ error: 'Módulo no encontrado' });

    await query(
      `INSERT INTO organization_modules (organization_id, module_id, activated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, module_id) DO NOTHING`,
      [orgId, moduleId, req.user.id]
    );

    invalidateOrgModules(orgId);

    // Nota: ya NO notificamos a los profesores al activar a nivel de org —
    // ahora la visibilidad por profesor depende de user_modules. La
    // notificación se dispara cuando el admin asigna el módulo al profesor.

    res.json({ ok: true, moduleId });
  } catch (err) {
    console.error('activateModule error:', err);
    res.status(500).json({ error: 'Error al activar módulo' });
  }
};

// DELETE /api/organizations/:orgId/modules/:moduleId
const deactivateModule = async (req, res) => {
  try {
    const { orgId, moduleId } = req.params;
    if (req.user.role !== 'superadmin' &&
        (req.user.role !== 'admin_centro' || req.user.organization_id !== orgId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    await query(
      `DELETE FROM organization_modules WHERE organization_id = $1 AND module_id = $2`,
      [orgId, moduleId]
    );

    // Limpiar asignaciones profesor↔módulo dentro de la org. Sin esto, los
    // profesores conservarían un acceso huérfano que ya no respaldaría
    // organization_modules.
    const { rows: affectedUsers } = await query(
      `DELETE FROM user_modules
        WHERE module_id = $1
          AND user_id IN (SELECT id FROM users WHERE organization_id = $2)
        RETURNING user_id`,
      [moduleId, orgId]
    );
    affectedUsers.forEach((r) => invalidateUserModules(r.user_id));

    invalidateOrgModules(orgId);

    // Solo notificamos a los profesores que realmente perdieron el módulo
    // (los que lo tenían asignado por user_modules antes del DELETE).
    if (affectedUsers.length > 0) {
      const { rows: [m] } = await query(`SELECT name FROM modules WHERE id = $1`, [moduleId]);
      await Promise.all(affectedUsers.map((row) => notify({
        userId: row.user_id,
        organizationId: orgId,
        type: TYPES.MODULE_DEACTIVATED,
        title: `Módulo desactivado: ${m?.name || moduleId}`,
        body: 'El admin del centro ha desactivado este módulo en todo el centro.',
        link: '/dashboard',
        metadata: { moduleId },
      })));
    }

    res.json({ ok: true, moduleId });
  } catch (err) {
    console.error('deactivateModule error:', err);
    res.status(500).json({ error: 'Error al desactivar módulo' });
  }
};

// GET /api/organizations/:orgId/onboarding-state
const getOnboardingState = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (req.user.role !== 'superadmin' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { rows: [s] } = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM organization_modules WHERE organization_id = $1) AS modules_count,
         (SELECT COUNT(*)::int FROM users WHERE organization_id = $1) AS users_count,
         (SELECT COUNT(*)::int FROM exams WHERE organization_id = $1) AS exams_count,
         o.onboarding_completed_at
       FROM organizations o WHERE o.id = $1`,
      [orgId]
    );

    if (!s) return res.status(404).json({ error: 'Organización no encontrada' });

    const has_modules = s.modules_count > 0;
    const has_users   = s.users_count > 1;
    const has_exams   = s.exams_count > 0;
    const completed   = s.onboarding_completed_at !== null ||
                        (has_modules && has_users && has_exams);

    res.json({
      has_modules,
      has_users,
      has_exams,
      completed,
      onboarding_completed_at: s.onboarding_completed_at,
    });
  } catch (err) {
    console.error('getOnboardingState error:', err);
    res.status(500).json({ error: 'Error al obtener estado de onboarding' });
  }
};

// POST /api/organizations/:orgId/onboarding-state/complete
const completeOnboarding = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (req.user.role !== 'superadmin' &&
        (req.user.role !== 'admin_centro' || req.user.organization_id !== orgId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    await query(
      `UPDATE organizations
       SET onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())
       WHERE id = $1`,
      [orgId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('completeOnboarding error:', err);
    res.status(500).json({ error: 'Error al marcar onboarding completado' });
  }
};

// ── Asignación profesor↔módulo ────────────────────────────
// Solo el admin_centro de la propia org (o superadmin) puede gestionar las
// asignaciones. El módulo debe estar activo en la organización del profesor.

const ensureAdminOverUser = async (req, userId) => {
  const { rows: [u] } = await query(
    `SELECT id, organization_id, role FROM users WHERE id = $1`,
    [userId]
  );
  if (!u) return { error: 'Usuario no encontrado', status: 404 };
  if (req.user.role !== 'superadmin') {
    if (req.user.role !== 'admin_centro' || req.user.organization_id !== u.organization_id) {
      return { error: 'Acceso denegado', status: 403 };
    }
  }
  return { user: u };
};

// GET /api/users/:userId/modules
const listUserModules = async (req, res) => {
  try {
    const { userId } = req.params;
    const isSelf = req.user.id === userId;
    if (!isSelf) {
      const check = await ensureAdminOverUser(req, userId);
      if (check.error) return res.status(check.status).json({ error: check.error });
    }
    const { rows } = await query(
      `SELECT m.id, m.name, m.stage, m.category, m.icon, m.route_prefix,
              m.sort_order, um.assigned_at
       FROM user_modules um
       JOIN modules m ON m.id = um.module_id
       WHERE um.user_id = $1
       ORDER BY m.stage, m.sort_order, m.name`,
      [userId]
    );
    res.json({ modules: rows });
  } catch (err) {
    console.error('listUserModules error:', err);
    res.status(500).json({ error: 'Error al obtener módulos del usuario' });
  }
};

// POST /api/users/:userId/modules/:moduleId
const assignUserModule = async (req, res) => {
  try {
    const { userId, moduleId } = req.params;
    const check = await ensureAdminOverUser(req, userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const target = check.user;

    // El módulo debe estar activo en la organización del profesor.
    const { rows: [active] } = await query(
      `SELECT 1 FROM organization_modules
        WHERE organization_id = $1 AND module_id = $2`,
      [target.organization_id, moduleId]
    );
    if (!active) {
      return res.status(409).json({
        error: 'El módulo no está activado en la organización',
        code: 'MODULE_INACTIVE_FOR_ORG',
      });
    }

    await query(
      `INSERT INTO user_modules (user_id, module_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, module_id) DO NOTHING`,
      [userId, moduleId, req.user.id]
    );
    invalidateUserModules(userId);

    const { rows: [mod] } = await query(
      `SELECT name, route_prefix FROM modules WHERE id = $1`, [moduleId]
    );
    await notify({
      userId,
      organizationId: target.organization_id,
      type: TYPES.MODULE_ACTIVATED,
      title: `Módulo asignado: ${mod?.name || moduleId}`,
      body: 'El admin del centro te ha asignado este módulo. Ya puedes usar sus herramientas.',
      link: mod?.route_prefix || '/dashboard',
      metadata: { moduleId },
    });

    res.json({ ok: true, userId, moduleId });
  } catch (err) {
    console.error('assignUserModule error:', err);
    res.status(500).json({ error: 'Error al asignar módulo' });
  }
};

// DELETE /api/users/:userId/modules/:moduleId
const unassignUserModule = async (req, res) => {
  try {
    const { userId, moduleId } = req.params;
    const check = await ensureAdminOverUser(req, userId);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const target = check.user;

    await query(
      `DELETE FROM user_modules WHERE user_id = $1 AND module_id = $2`,
      [userId, moduleId]
    );
    invalidateUserModules(userId);

    const { rows: [mod] } = await query(`SELECT name FROM modules WHERE id = $1`, [moduleId]);
    await notify({
      userId,
      organizationId: target.organization_id,
      type: TYPES.MODULE_DEACTIVATED,
      title: `Módulo retirado: ${mod?.name || moduleId}`,
      body: 'El admin del centro ha retirado este módulo de tu cuenta.',
      link: '/dashboard',
      metadata: { moduleId },
    });

    res.json({ ok: true, userId, moduleId });
  } catch (err) {
    console.error('unassignUserModule error:', err);
    res.status(500).json({ error: 'Error al desasignar módulo' });
  }
};

module.exports = {
  listCatalog,
  listOrgModules,
  activateModule,
  deactivateModule,
  getOnboardingState,
  completeOnboarding,
  listUserModules,
  assignUserModule,
  unassignUserModule,
};
