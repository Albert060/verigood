const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.organization_id, u.is_active,
              o.name as org_name, o.plan, o.active_modules, o.is_active as org_active
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Cuenta desactivada' });
    }

    if (!user.org_active) {
      return res.status(403).json({ error: 'Organización suspendida' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const authenticateSuperadmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
};

// ── Cache de módulos activos por organización ─────────────────
// Lee organization_modules con TTL 60s. Se invalida desde el controller
// de toggle (activateModule / deactivateModule).
const MODULE_CACHE_TTL_MS = 60_000;
const moduleCache = new Map(); // orgId -> { modules: Set<string>, expiresAt: number }

const getOrgModules = async (orgId) => {
  const hit = moduleCache.get(orgId);
  if (hit && hit.expiresAt > Date.now()) return hit.modules;

  const { rows } = await query(
    `SELECT module_id FROM organization_modules WHERE organization_id = $1`,
    [orgId]
  );
  const set = new Set(rows.map((r) => r.module_id));
  moduleCache.set(orgId, { modules: set, expiresAt: Date.now() + MODULE_CACHE_TTL_MS });
  return set;
};

const invalidateOrgModules = (orgId) => {
  moduleCache.delete(orgId);
};

const requireModule = (moduleId) => {
  return async (req, res, next) => {
    try {
      const orgId = req.user?.organization_id;
      if (!orgId) {
        return res.status(403).json({ error: 'Sin organización', code: 'NO_ORG' });
      }
      const mods = await getOrgModules(orgId);
      if (!mods.has(moduleId)) {
        return res.status(403).json({
          error: 'Módulo no activado',
          module: moduleId,
          code: 'MODULE_INACTIVE',
        });
      }
      next();
    } catch (err) {
      console.error('requireModule error:', err);
      res.status(500).json({ error: 'Error al verificar módulo' });
    }
  };
};

module.exports = {
  authenticate,
  authenticateSuperadmin,
  authorize,
  requireModule,
  invalidateOrgModules,
};
