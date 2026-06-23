const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// GET /organizations/:orgId/users
const getUsers = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    // Only admin can see own org, superadmin can see any
    if (req.user.role !== 'superadmin' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const searchParam = `%${search}%`;
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login, u.created_at,
              COUNT(DISTINCT ea.id) as exam_count
       FROM users u
       LEFT JOIN exam_attempts ea ON ea.teacher_id = u.id
       WHERE u.organization_id = $1
         AND ($2 = '%%' OR u.name ILIKE $2 OR u.email ILIKE $2)
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $3 OFFSET $4`,
      [orgId, searchParam, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users WHERE organization_id = $1
         AND ($2 = '%%' OR name ILIKE $2 OR email ILIKE $2)`,
      [orgId, searchParam]
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// POST /organizations/:orgId/users — invite/create teacher
const createUser = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, email, role = 'profesor', password } = req.body;

    if (req.user.role !== 'superadmin' && req.user.organization_id !== orgId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'Este email ya está registrado' });
    }

    const tempPassword = password || Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, organization_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, email, role, created_at`,
      [name, email.toLowerCase(), hashedPassword, role, orgId]
    );

    res.status(201).json({ user: result.rows[0], tempPassword: password ? undefined : tempPassword });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// PATCH /users/:userId — editar nombre / rol / activación
// Permite tanto la edición desde el modal "Editar profesor" (name/role) como
// el toggle Activar/Desactivar (is_active). Salvaguardas:
//   - admin_centro no puede editarse a sí mismo (evita autobloqueo por error).
//   - solo superadmin puede mover un usuario a rol superadmin.
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, role, is_active } = req.body;

    const userResult = await query('SELECT organization_id, role FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const target = userResult.rows[0];

    if (req.user.role !== 'superadmin' && target.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    if (req.user.id === userId && (role !== undefined || is_active === false)) {
      return res.status(409).json({
        error: 'No puedes cambiar tu propio rol ni desactivarte. Pídele a otro admin que lo haga.',
        code: 'CANNOT_SELF_MUTATE',
      });
    }
    if (role !== undefined && !['admin_centro', 'profesor'].includes(role) && req.user.role !== 'superadmin') {
      return res.status(400).json({ error: 'Rol no válido', code: 'BAD_ROLE' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      }
      fields.push(`name = $${idx++}`); values.push(name.trim());
    }
    if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

    if (!fields.length) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, is_active`,
      values
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// DELETE /users/:userId — eliminación REAL del profesor.
// Las FKs hacia users (exams, exam_attempts, usage_logs, library_items) son
// NOT NULL sin CASCADE, así que solo permitimos borrado duro cuando el profe
// no tiene actividad asociada (típicamente cuentas recién invitadas que nunca
// llegaron a usarse). Si tiene historial, devolvemos 409 y el admin tiene que
// recurrir a "Desactivar" para preservar trazabilidad / RGPD.
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await query('SELECT organization_id, role FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const target = userResult.rows[0];

    if (req.user.role !== 'superadmin' && target.organization_id !== req.user.organization_id) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    if (req.user.id === userId) {
      return res.status(409).json({
        error: 'No puedes eliminar tu propia cuenta',
        code: 'CANNOT_SELF_DELETE',
      });
    }
    if (target.role === 'admin_centro') {
      // Evita que el centro se quede sin ningún admin activo.
      const { rows: [count] } = await query(
        `SELECT COUNT(*)::int AS n FROM users
          WHERE organization_id = $1 AND role = 'admin_centro' AND is_active = true AND id <> $2`,
        [target.organization_id, userId]
      );
      if (count.n === 0) {
        return res.status(409).json({
          error: 'No puedes eliminar al último administrador activo del centro',
          code: 'LAST_ADMIN',
        });
      }
    }

    // Comprueba historial. Si existe, NO borramos: invitamos a desactivar.
    const { rows: [usage] } = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM usage_logs     WHERE user_id    = $1) AS usage_count,
         (SELECT COUNT(*)::int FROM exams          WHERE teacher_id = $1) AS exams_count,
         (SELECT COUNT(*)::int FROM exam_attempts  WHERE teacher_id = $1) AS attempts_count,
         (SELECT COUNT(*)::int FROM library_items  WHERE teacher_id = $1) AS library_count`,
      [userId]
    );
    const total = usage.usage_count + usage.exams_count + usage.attempts_count + usage.library_count;
    if (total > 0) {
      return res.status(409).json({
        error: 'Este profesor tiene actividad registrada. Desactívalo en su lugar para conservar el historial.',
        code: 'HAS_ACTIVITY',
        counts: usage,
      });
    }

    // Sin historial: borrado duro. refresh_tokens, notifications y
    // user_modules tienen CASCADE → se limpian solos.
    await query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ ok: true, message: 'Profesor eliminado' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
