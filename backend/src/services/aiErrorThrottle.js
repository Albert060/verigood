// Acumula errores de IA por (organización, código) en una ventana corta y,
// si se alcanza un umbral, dispara UNA sola notificación al admin del centro.
// Sin BD: estado en memoria del proceso. Si el proceso reinicia, se resetea.
// El objetivo es evitar que un fallo recurrente (clave inválida, 5xx) inunde
// la campana con N alertas.
//
// Uso típico desde un catch:
//   await trackAiError({ orgId, code, message });

const { notifyRole, notifySuperadmins, TYPES } = require('./notifyService');

const WINDOW_MS = 15 * 60 * 1000;       // 15 min — ventana deslizante
const THRESHOLD = 3;                     // 3 errores → 1 notificación
const NOTIFY_COOLDOWN_MS = 60 * 60 * 1000; // 1 h — no repetir aviso

// Map<orgId, Map<code, { count, firstAt, notifiedAt }>>
const state = new Map();

const getBucket = (orgId, code) => {
  let perOrg = state.get(orgId);
  if (!perOrg) {
    perOrg = new Map();
    state.set(orgId, perOrg);
  }
  let bucket = perOrg.get(code);
  if (!bucket) {
    bucket = { count: 0, firstAt: 0, notifiedAt: 0 };
    perOrg.set(code, bucket);
  }
  return bucket;
};

const HUMAN = {
  AI_INVALID_KEY:    'La clave de Anthropic no es válida o ha sido revocada',
  AI_NOT_CONFIGURED: 'No hay clave de IA configurada en el servidor',
  AI_RATE_LIMITED:   'Anthropic está limitando las peticiones del centro',
  AI_UNAVAILABLE:    'La API de IA está caída o saturada',
  BAD_AI_RESPONSE:   'La IA está devolviendo respuestas malformadas',
};

const trackAiError = async ({ orgId, code, message }) => {
  if (!orgId || !code) return;
  const now = Date.now();
  const bucket = getBucket(orgId, code);

  // Si la ventana ha caducado, reiniciar el contador.
  if (now - bucket.firstAt > WINDOW_MS) {
    bucket.count = 0;
    bucket.firstAt = now;
  }
  bucket.count += 1;

  if (bucket.count < THRESHOLD) return;
  if (now - bucket.notifiedAt < NOTIFY_COOLDOWN_MS) return;

  bucket.notifiedAt = now;
  bucket.count = 0;
  bucket.firstAt = now;

  await notifyRole({
    organizationId: orgId,
    role: 'admin_centro',
    type: TYPES.AI_ERROR,
    title: `Errores de IA recurrentes (${code})`,
    body: HUMAN[code] || message || 'Los profesores están encontrando errores al generar recursos. Revisa la configuración o contacta con soporte.',
    link: '/dashboard',
    metadata: { code, threshold: THRESHOLD, windowMinutes: WINDOW_MS / 60000 },
  });

  // Espejo al superadmin para visibilidad de salud de la plataforma. Sólo
  // los códigos sistémicos (no AI_INVALID_KEY: ese es responsabilidad del
  // centro porque tiene su propia clave configurada).
  if (code !== 'AI_INVALID_KEY' && code !== 'AI_NOT_CONFIGURED') {
    await notifySuperadmins({
      type: TYPES.AI_ERROR,
      title: `Errores IA recurrentes en una org (${code})`,
      body: `Org ${orgId.slice(0, 8)} · ${HUMAN[code] || message || ''}`,
      link: '/superadmin/organizations',
      metadata: { code, orgId, threshold: THRESHOLD, windowMinutes: WINDOW_MS / 60000 },
    });
  }
};

// Solo para tests — vaciar estado en memoria entre casos.
const _resetForTests = () => state.clear();

module.exports = { trackAiError, _resetForTests };
