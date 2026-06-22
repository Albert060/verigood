// Aviso al admin cuando la organización se acerca al límite de tokens IA del
// mes. Los umbrales (50%, 80%, 100%) disparan UNA sola notificación por mes
// y por umbral, usando `notifications.metadata` como anti-spam.

const { query } = require('../config/database');
const { notifyRole, wasRecentlyNotified, TYPES } = require('./notifyService');

// Límites por plan (tokens consumidos por mes en usage_logs). Editar aquí
// cuando se redefinan los planes. enterprise = sin límite práctico.
const PLAN_LIMITS = {
  starter:    50_000,
  colegio:    500_000,
  enterprise: Infinity,
};

const THRESHOLDS = [0.50, 0.80, 1.00];

const getMonthlyTokens = async (orgId) => {
  const { rows } = await query(
    `SELECT COALESCE(SUM(tokens_used), 0)::bigint AS total
       FROM usage_logs
      WHERE organization_id = $1
        AND created_at >= date_trunc('month', NOW())`,
    [orgId]
  );
  return Number(rows[0]?.total || 0);
};

const monthKey = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Llamar tras una ejecución exitosa de tool (cuando ya se insertó en
// usage_logs). Si la org cruza un umbral nuevo, notifica.
const checkQuotaAfterUsage = async (orgId) => {
  if (!orgId) return;
  try {
    const { rows } = await query(
      `SELECT plan FROM organizations WHERE id = $1`,
      [orgId]
    );
    const plan = rows[0]?.plan;
    if (!plan) return;
    const limit = PLAN_LIMITS[plan];
    if (!limit || limit === Infinity) return;

    const used = await getMonthlyTokens(orgId);
    const ratio = used / limit;

    // Mayor umbral cruzado (o ninguno si está por debajo del 50%).
    const crossed = [...THRESHOLDS].reverse().find((t) => ratio >= t);
    if (!crossed) return;

    // Anti-spam: un admin no recibe dos veces el mismo umbral del mismo mes.
    // Usamos el primer admin como sonda barata; si él no fue notificado,
    // asumimos que ningún admin lo fue (notifyRole dispara a todos a la vez).
    const probe = await query(
      `SELECT id FROM users WHERE organization_id = $1 AND role = 'admin_centro' AND is_active = true LIMIT 1`,
      [orgId]
    );
    const adminId = probe.rows[0]?.id;
    if (!adminId) return;

    const month = monthKey();
    const already = await wasRecentlyNotified({
      userId: adminId,
      type: TYPES.QUOTA_WARNING,
      metadataMatch: { month, threshold: crossed },
      withinHours: 24 * 35, // basta con un mes amplio para cubrir todos los huecos
    });
    if (already) return;

    const pct = Math.round(crossed * 100);
    await notifyRole({
      organizationId: orgId,
      role: 'admin_centro',
      type: TYPES.QUOTA_WARNING,
      title: pct === 100
        ? 'Límite mensual de IA alcanzado'
        : `Has consumido el ${pct}% del límite mensual de IA`,
      body: pct === 100
        ? 'El centro ha agotado los tokens IA de este mes. Las tools seguirán funcionando con el límite duro de Anthropic, pero conviene revisar el plan.'
        : 'Te avisamos para que puedas planificar el resto del mes o considerar un plan superior.',
      link: '/dashboard/billing',
      metadata: { month, threshold: crossed, used, limit, plan },
    });
  } catch (err) {
    console.warn('checkQuotaAfterUsage failed (non-fatal):', err.message);
  }
};

module.exports = { checkQuotaAfterUsage, PLAN_LIMITS };
