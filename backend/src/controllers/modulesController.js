const { query } = require('../config/database');
const { invalidateOrgModules } = require('../middleware/auth');
const { notifyRole, TYPES } = require('../services/notifyService');

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
const listOrgModules = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (req.user.role !== 'superadmin' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await query(
      `SELECT m.id, m.name, m.stage, m.category, m.icon, m.route_prefix,
              m.sort_order, m.metadata, om.activated_at
       FROM organization_modules om
       JOIN modules m ON m.id = om.module_id
       WHERE om.organization_id = $1
       ORDER BY m.stage, m.sort_order, m.name`,
      [orgId]
    );
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

    // Notificar a todos los profesores del centro de que tienen un módulo nuevo.
    const modName = await query(`SELECT name, route_prefix FROM modules WHERE id = $1`, [moduleId]);
    const m = modName.rows[0] || {};
    await notifyRole({
      organizationId: orgId,
      role: 'profesor',
      type: TYPES.MODULE_ACTIVATED,
      title: `Nuevo módulo disponible: ${m.name || moduleId}`,
      body: 'El admin del centro ha activado este módulo. Ya puedes acceder a sus herramientas.',
      link: m.route_prefix || '/dashboard',
      metadata: { moduleId },
    });

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

    invalidateOrgModules(orgId);

    const modName = await query(`SELECT name FROM modules WHERE id = $1`, [moduleId]);
    const m = modName.rows[0] || {};
    await notifyRole({
      organizationId: orgId,
      role: 'profesor',
      type: TYPES.MODULE_DEACTIVATED,
      title: `Módulo desactivado: ${m.name || moduleId}`,
      body: 'El admin del centro ha desactivado este módulo.',
      link: '/dashboard',
      metadata: { moduleId },
    });

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

module.exports = {
  listCatalog,
  listOrgModules,
  activateModule,
  deactivateModule,
  getOnboardingState,
  completeOnboarding,
};
