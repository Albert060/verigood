// Helper centralizado para crear notificaciones in-app desde cualquier
// controlador o servicio. Best-effort: si la tabla aún no existe (migración 005
// pendiente) o falla la inserción, no rompe el flujo del caller.

const { query } = require('../config/database');

// Tipos válidos (informativo; no se valida en BD para permitir extensión).
const TYPES = {
  MODULE_ACTIVATED:    'module_activated',
  MODULE_DEACTIVATED:  'module_deactivated',
  TOOL_GENERATED:      'tool_generated',
  EXAM_SAVED:          'exam_saved',
  OCR_COMPLETED:       'ocr_completed',
  INVOICE_PAID:        'invoice_paid',
  AI_ERROR:            'ai_error',
  SYSTEM:              'system',
  // Supervisión del admin (no son ruido del profe, son alertas accionables).
  TEACHER_FIRST_LOGIN: 'teacher_first_login',
  TEACHER_INACTIVE:    'teacher_inactive',
  QUOTA_WARNING:       'quota_warning',
  WEEKLY_DIGEST:       'weekly_digest',
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

// Comprueba si un usuario ya recibió una notificación del mismo tipo + clave
// de metadata en una ventana de tiempo. Sirve para evitar spam (avisos de
// cuota repetidos en el mismo mes, profe inactivo repetido cada semana, etc.).
// `metadataMatch` es un objeto cuyos pares se comprueban con el operador @>
// de jsonb. Falla silencioso → devuelve false (no bloquear notificación).
const wasRecentlyNotified = async ({ userId, type, metadataMatch = {}, withinHours = 24 }) => {
  if (!userId || !type) return false;
  try {
    const { rows } = await query(
      `SELECT 1 FROM notifications
        WHERE user_id = $1
          AND type = $2
          AND metadata @> $3::jsonb
          AND created_at > NOW() - ($4 || ' hours')::INTERVAL
        LIMIT 1`,
      [userId, type, JSON.stringify(metadataMatch), String(withinHours)]
    );
    return rows.length > 0;
  } catch (err) {
    if (err.code !== '42P01') {
      console.warn('wasRecentlyNotified failed (non-fatal):', err.message);
    }
    return false;
  }
};

module.exports = { notify, notifyRole, wasRecentlyNotified, TYPES };
