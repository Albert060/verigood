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

    // LEFT JOIN: el superadmin no tiene organization_id, pero sigue siendo un
    // usuario válido. Antes era INNER JOIN y devolvía 0 filas → 401 silencioso
    // en cualquier ruta autenticada genérica (catálogo de módulos, listar
    // módulos de una org concreta, etc.) cuando el llamante era superadmin.
    const result = await query(
      `SELECT u.id, u.email, u.name, u.role, u.organization_id, u.is_active,
              o.name as org_name, o.plan, o.active_modules,
              COALESCE(o.is_active, true) as org_active
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
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

    // El check de organización suspendida sólo aplica a usuarios con org
    // (admin_centro / profesor). El superadmin es transversal y no tiene una.
    if (user.role !== 'superadmin' && !user.org_active) {
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

// ── Cache de módulos asignados por usuario (profesor) ─────────
// Misma estrategia que getOrgModules pero a nivel de user_id. Se invalida
// desde el controller que asigna/desasigna módulos a un profesor.
const userModuleCache = new Map(); // userId -> { modules: Set<string>, expiresAt: number }

const getUserModules = async (userId) => {
  const hit = userModuleCache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.modules;

  const { rows } = await query(
    `SELECT module_id FROM user_modules WHERE user_id = $1`,
    [userId]
  );
  const set = new Set(rows.map((r) => r.module_id));
  userModuleCache.set(userId, { modules: set, expiresAt: Date.now() + MODULE_CACHE_TTL_MS });
  return set;
};

const invalidateUserModules = (userId) => {
  userModuleCache.delete(userId);
};

// Comprueba que el módulo esté activo en la org Y, si el usuario es profesor,
// que además le esté asignado. admin_centro y superadmin pasan con solo el
// chequeo de organización.
const userCanAccessModule = async (user, moduleId) => {
  const orgMods = await getOrgModules(user.organization_id);
  if (!orgMods.has(moduleId)) return { ok: false, code: 'MODULE_INACTIVE' };
  if (user.role === 'profesor') {
    const userMods = await getUserModules(user.id);
    if (!userMods.has(moduleId)) return { ok: false, code: 'MODULE_NOT_ASSIGNED' };
  }
  return { ok: true };
};

const requireModule = (moduleId) => {
  return async (req, res, next) => {
    try {
      const orgId = req.user?.organization_id;
      if (!orgId) {
        return res.status(403).json({ error: 'Sin organización', code: 'NO_ORG' });
      }
      const check = await userCanAccessModule(req.user, moduleId);
      if (!check.ok) {
        return res.status(403).json({
          error: check.code === 'MODULE_NOT_ASSIGNED'
            ? 'Módulo no asignado a este profesor'
            : 'Módulo no activado',
          module: moduleId,
          code: check.code,
        });
      }
      next();
    } catch (err) {
      console.error('requireModule error:', err);
      res.status(500).json({ error: 'Error al verificar módulo' });
    }
  };
};

// requireModuleActive — variante paramétrica que lee el moduleId de req.params.
// Útil para endpoints genéricos como /api/modules/:moduleId/tools/:toolKey/run
// donde el módulo a comprobar no se conoce en tiempo de registro de la ruta.
const requireModuleActive = async (req, res, next) => {
  try {
    const orgId = req.user?.organization_id;
    const moduleId = req.params?.moduleId;
    if (!orgId) {
      return res.status(403).json({ error: 'Sin organización', code: 'NO_ORG' });
    }
    if (!moduleId) {
      return res.status(400).json({ error: 'moduleId requerido', code: 'NO_MODULE_PARAM' });
    }
    // superadmin atraviesa la comprobación (acceso global).
    if (req.user.role === 'superadmin') return next();
    const check = await userCanAccessModule(req.user, moduleId);
    if (!check.ok) {
      return res.status(403).json({
        error: check.code === 'MODULE_NOT_ASSIGNED'
          ? 'Módulo no asignado a este profesor'
          : 'Módulo no activado',
        module: moduleId,
        code: check.code,
      });
    }
    next();
  } catch (err) {
    console.error('requireModuleActive error:', err);
    res.status(500).json({ error: 'Error al verificar módulo' });
  }
};

module.exports = {
  authenticate,
  authenticateSuperadmin,
  authorize,
  requireModule,
  requireModuleActive,
  invalidateOrgModules,
  invalidateUserModules,
  getUserModules,
  userCanAccessModule,
};
