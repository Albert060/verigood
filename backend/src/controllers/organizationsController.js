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

    const [usersResult, usageResult, recentResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FILTER (WHERE is_active) as active_users,
                COUNT(*) as total_users
         FROM users WHERE organization_id = $1`,
        [orgId]
      ),
      query(
        `SELECT module, action_type, COUNT(*) as count
         FROM usage_logs
         WHERE organization_id = $1
           AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY module, action_type
         ORDER BY count DESC`,
        [orgId]
      ),
      query(
        `SELECT ul.action_type, ul.module, ul.created_at,
                u.name as user_name
         FROM usage_logs ul
         JOIN users u ON ul.user_id = u.id
         WHERE ul.organization_id = $1
         ORDER BY ul.created_at DESC
         LIMIT 10`,
        [orgId]
      ),
    ]);

    res.json({
      users: usersResult.rows[0],
      usageByModule: usageResult.rows,
      recentActivity: recentResult.rows,
    });
  } catch (err) {
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
