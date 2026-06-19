// Helper centralizado para crear notificaciones in-app desde cualquier
// controlador o servicio. Best-effort: si la tabla aún no existe (migración 005
// pendiente) o falla la inserción, no rompe el flujo del caller.

const { query } = require('../config/database');

// Tipos válidos (informativo; no se valida en BD para permitir extensión).
const TYPES = {
  MODULE_ACTIVATED:   'module_activated',
  MODULE_DEACTIVATED: 'module_deactivated',
  TOOL_GENERATED:     'tool_generated',
  EXAM_SAVED:         'exam_saved',
  OCR_COMPLETED:      'ocr_completed',
  INVOICE_PAID:       'invoice_paid',
  AI_ERROR:           'ai_error',
  SYSTEM:             'system',
};

// Crea una notificación para un usuario concreto.
const notify = async ({ userId, organizationId = null, type, title, body = null, link = null, metadata = {} }) => {
  if (!userId || !type || !title) {
    console.warn('notify: userId, type y title son obligatorios — descartado');
    return null;
  }
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, organization_id, type, title, body, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, organizationId, type, title.slice(0, 255), body, link, JSON.stringify(metadata)]
    );
    return result.rows[0].id;
  } catch (err) {
    if (err.code === '42P01') {
      console.warn('notifications: tabla no existe. Pasa la migración 005.');
    } else {
      console.warn('notify failed (non-fatal):', err.message);
    }
    return null;
  }
};

// Notifica a TODOS los usuarios de una organización con un rol concreto.
// Útil cuando un cambio afecta a "todos los profesores" o "todos los admins"
// del centro (p.ej. módulo activado por admin → profesores).
const notifyRole = async ({ organizationId, role, type, title, body = null, link = null, metadata = {} }) => {
  if (!organizationId || !role) return [];
  try {
    const { rows } = await query(
      `SELECT id FROM users WHERE organization_id = $1 AND role = $2 AND is_active = true`,
      [organizationId, role]
    );
    const ids = [];
    for (const u of rows) {
      const id = await notify({ userId: u.id, organizationId, type, title, body, link, metadata });
      if (id) ids.push(id);
    }
    return ids;
  } catch (err) {
    console.warn('notifyRole failed (non-fatal):', err.message);
    return [];
  }
};

module.exports = { notify, notifyRole, TYPES };
