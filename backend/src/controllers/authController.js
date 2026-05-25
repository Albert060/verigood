const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../config/database');

const generateTokens = (userId, role, orgId) => {
  const accessToken = jwt.sign(
    { userId, role, orgId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, role, orgId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// POST /auth/register — crea organización + usuario admin en transacción
const register = async (req, res) => {
  const client = await getClient();
  try {
    const { orgName, orgCity, adminName, adminEmail, adminPassword, plan = 'starter' } = req.body;

    if (!orgName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Check email unique
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail.toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'Este email ya está registrado' });
    }

    await client.query('BEGIN');

    // Create organization
    const orgResult = await client.query(
      `INSERT INTO organizations (name, city, plan, active_modules, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [orgName, orgCity || null, plan, ['cambridge']]
    );
    const orgId = orgResult.rows[0].id;

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Create admin user
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, organization_id, is_active)
       VALUES ($1, $2, $3, 'admin_centro', $4, true) RETURNING id`,
      [adminName, adminEmail.toLowerCase(), hashedPassword, orgId]
    );
    const userId = userResult.rows[0].id;

    await client.query('COMMIT');

    const { accessToken, refreshToken } = generateTokens(userId, 'admin_centro', orgId);

    // Store refresh token
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [userId, refreshToken]
    );

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: userId, name: adminName, email: adminEmail, role: 'admin_centro', orgId, orgName },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('register error:', err);
    res.status(500).json({ error: 'Error al crear la cuenta' });
  } finally {
    client.release();
  }
};

// POST /auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.is_active,
              u.organization_id, o.name as org_name, o.plan, o.active_modules, o.is_active as org_active
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacta con tu administrador.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (user.role !== 'superadmin' && user.org_active === false) {
      return res.status(403).json({ error: 'Tu organización está suspendida. Contacta con soporte.' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.organization_id);

    // Store refresh token (rotate)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()', [user.id]);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.organization_id,
        orgName: user.org_name,
        plan: user.plan,
        activeModules: user.active_modules,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// POST /auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Verify token exists in DB (rotation)
    const stored = await query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    if (!stored.rows[0]) {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId,
      decoded.role,
      decoded.orgId
    );

    // Rotate
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [decoded.userId, newRefreshToken]
    );

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// POST /auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.json({ message: 'Sesión cerrada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

// GET /auth/me
const me = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.organization_id,
              o.name as org_name, o.plan, o.active_modules
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: user.organization_id,
      orgName: user.org_name,
      plan: user.plan,
      activeModules: user.active_modules,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

module.exports = { register, login, refresh, logout, me };
