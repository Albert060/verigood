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

    // Visibilidad de actividad reciente / consumo por módulo:
    // - admin_centro y superadmin ven toda la org.
    // - profesor ve solo lo que él mismo ha generado. El criterio "módulos
    //   asignados" se cumple por construcción: requireModuleActive impide
    //   ejecutar tools de módulos no asignados, así que el conjunto de
    //   usage_logs.user_id = req.user.id ya está acotado a esos módulos.
    const isProfesor = req.user.role === 'profesor';
    const ownerFilter = isProfesor ? ' AND ul.user_id = $2' : '';
    const ownerParams = isProfesor ? [orgId, req.user.id] : [orgId];

    const [usersResult, usageResult, recentResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FILTER (WHERE is_active) as active_users,
                COUNT(*) as total_users
         FROM users WHERE organization_id = $1`,
        [orgId]
      ),
      // usageByModule + recentActivity: resolvemos el moduleId real desde
      // metadata->>'moduleId' (tools Fase 1 escriben aquí el id del catálogo
      // mientras que `module` queda hardcodeado a 'cambridge' por el enum
      // legacy). Cuando metadata no lo trae (Cambridge nativo), caemos al
      // module::text. Después hacemos LEFT JOIN con `modules` para devolver
      // el nombre legible ("Matemáticas Primaria" en vez de "matematicas_primaria").
      query(
        `WITH ul_resolved AS (
           SELECT COALESCE(ul.metadata->>'moduleId', ul.module::text) AS module_id,
                  ul.action_type
             FROM usage_logs ul
            WHERE ul.organization_id = $1
              AND ul.created_at >= NOW() - INTERVAL '30 days'
              ${ownerFilter}
         )
         SELECT u.module_id,
                COALESCE(m.name, u.module_id) AS module,
                u.action_type,
                COUNT(*) AS count
           FROM ul_resolved u
           LEFT JOIN modules m ON m.id = u.module_id
          GROUP BY u.module_id, m.name, u.action_type
          ORDER BY count DESC`,
        ownerParams
      ),
      query(
        `SELECT ul.action_type,
                COALESCE(ul.metadata->>'moduleId', ul.module::text) AS module_id,
                COALESCE(m.name, COALESCE(ul.metadata->>'moduleId', ul.module::text)) AS module,
                ul.created_at,
                u.name as user_name
           FROM usage_logs ul
           JOIN users u ON ul.user_id = u.id
           LEFT JOIN modules m ON m.id = COALESCE(ul.metadata->>'moduleId', ul.module::text)
          WHERE ul.organization_id = $1
            ${ownerFilter}
          ORDER BY ul.created_at DESC
          LIMIT 10`,
        ownerParams
      ),
    ]);

    // Agregados para la página /dashboard/stats. Todo viene de usage_logs.
    // El módulo "real" vive en metadata->>'moduleId' para las tools del
    // catálogo Fase 1 (porque module es un enum legacy hardcodeado a
    // 'cambridge'). Para Cambridge nativo, metadata.moduleId no existe y
    // usamos module::text.
    // Categorización de action_type → exámenes / correcciones / dinámicas
    // se hace por LIKE; es heurística pero estable con el catálogo actual.
    const realModuleExpr = `COALESCE(metadata->>'moduleId', module::text)`;
    const categoryExpr = `CASE
        WHEN action_type ILIKE '%correct%' OR action_type ILIKE '%ocr%' THEN 'corrections'
        WHEN action_type ILIKE '%dynamic%' OR action_type ILIKE '%dinamic%' THEN 'dynamics'
        ELSE 'exams'
      END`;

    const [totalsResult, weeklyResult, moduleBreakResult, byTeacherResult, modulesCatalogResult] = await Promise.all([
      // Totales del mes en curso + mes anterior (para delta).
      query(
        `SELECT
           COUNT(*) FILTER (WHERE ul.created_at >= date_trunc('month', NOW()))::int AS current_month,
           COUNT(*) FILTER (
             WHERE ul.created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
               AND ul.created_at <  date_trunc('month', NOW())
           )::int AS previous_month
         FROM usage_logs ul
         WHERE ul.organization_id = $1 ${ownerFilter}`,
        ownerParams
      ),
      // Uso por semana del mes en curso (semana 1 a 5 según el día del mes).
      query(
        `SELECT
           LEAST(5, CEIL(EXTRACT(DAY FROM ul.created_at)::int / 7.0))::int AS week,
           COUNT(*)::int AS count
         FROM usage_logs ul
         WHERE ul.organization_id = $1
           AND ul.created_at >= date_trunc('month', NOW())
           ${ownerFilter}
         GROUP BY week
         ORDER BY week`,
        ownerParams
      ),
      // Uso por módulo (mes en curso). Usa el moduleId real cuando lo hay.
      query(
        `SELECT ${realModuleExpr} AS module_id, COUNT(*)::int AS count
         FROM usage_logs ul
         WHERE ul.organization_id = $1
           AND ul.created_at >= date_trunc('month', NOW())
           ${ownerFilter}
         GROUP BY module_id
         ORDER BY count DESC
         LIMIT 8`,
        ownerParams
      ),
      // Desglose por profesor del centro (mes en curso) con categorías.
      query(
        `SELECT
           u.id, u.name,
           COUNT(*) FILTER (WHERE ${categoryExpr} = 'exams')::int       AS exams,
           COUNT(*) FILTER (WHERE ${categoryExpr} = 'corrections')::int AS corrections,
           COUNT(*) FILTER (WHERE ${categoryExpr} = 'dynamics')::int    AS dynamics,
           COUNT(*)::int AS total
         FROM usage_logs ul
         JOIN users u ON u.id = ul.user_id
         WHERE ul.organization_id = $1
           AND ul.created_at >= date_trunc('month', NOW())
           ${ownerFilter}
         GROUP BY u.id, u.name
         ORDER BY total DESC
         LIMIT 12`,
        ownerParams
      ),
      // Nombres legibles del catálogo para mostrar en la breakdown / top.
      query(`SELECT id, name FROM modules`),
    ]);

    const moduleNameById = Object.fromEntries(
      modulesCatalogResult.rows.map((m) => [m.id, m.name])
    );
    const labelFor = (id) => moduleNameById[id] || id;

    const breakdown = moduleBreakResult.rows.map((r) => ({
      module_id: r.module_id,
      label: labelFor(r.module_id),
      count: r.count,
    }));

    const teacherStats = byTeacherResult.rows;
    const totals = totalsResult.rows[0] || { current_month: 0, previous_month: 0 };
    const deltaPct = totals.previous_month > 0
      ? Math.round(((totals.current_month - totals.previous_month) / totals.previous_month) * 100)
      : null;

    // Heurística: cada generación ahorra ~15 minutos de trabajo manual.
    const hoursSaved = Math.round(totals.current_month * 0.25);

    const topTeacher = teacherStats[0] || null;
    const topModule = breakdown[0] || null;

    res.json({
      users: usersResult.rows[0],
      usageByModule: usageResult.rows,
      recentActivity: recentResult.rows,
      // Bloques específicos de /dashboard/stats:
      monthly: {
        current_month:  totals.current_month,
        previous_month: totals.previous_month,
        delta_pct:      deltaPct,
        hours_saved:    hoursSaved,
      },
      weeklyUsage: weeklyResult.rows, // [{ week: 1..5, count }]
      moduleBreakdown: breakdown,     // [{ module_id, label, count }]
      teacherStats,                   // [{ id, name, exams, corrections, dynamics, total }]
      topTeacher: topTeacher ? { id: topTeacher.id, name: topTeacher.name, total: topTeacher.total } : null,
      topModule:  topModule  ? { id: topModule.module_id, label: topModule.label, count: topModule.count } : null,
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// PATCH /organizations/:orgId/modules — toggle modules (admin only)
// T19 · Antes usaba una lista hardcodeada `['cambridge', 'espanol',
// 'matematicas', 'medio', 'oposiciones']` que estaba desincronizada del
// catálogo real. Este endpoint escribe en `organizations.active_modules`,
// que es un tipo ENUM `module_type` en PostgreSQL (deprecated según
// CLAUDE.md; la fuente de verdad real vive en `organization_modules`).
// Como el ENUM sigue restringiendo los valores aceptados, consultamos sus
// variantes en tiempo de ejecución (`enum_range`) para no acoplarnos a una
// lista estática que se va a desactualizar. También añadimos validación de
// que activeModules sea array (antes null/objeto daba 500).
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
    if (!Array.isArray(activeModules)) {
      return res.status(400).json({ error: 'activeModules debe ser un array' });
    }

    // Fuente de verdad: valores actualmente aceptados por el ENUM legacy.
    const { rows: enumRows } = await query(
      `SELECT unnest(enum_range(NULL::module_type))::text AS name`
    );
    const validSet = new Set(enumRows.map((r) => r.name));
    const filtered = activeModules.filter((m) => validSet.has(m));

    const result = await query(
      `UPDATE organizations SET active_modules = $1, updated_at = NOW() WHERE id = $2 RETURNING active_modules`,
      [filtered, orgId]
    );

    res.json({ activeModules: result.rows[0].active_modules });
  } catch (err) {
    console.error('updateModules error:', err);
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
              COUNT(DISTINCT ul.id) FILTER (WHERE ul.created_at >= NOW() - INTERVAL '30 days') as monthly_usage,
              COALESCE(
                (SELECT array_agg(om.module_id ORDER BY om.module_id)
                   FROM organization_modules om
                  WHERE om.organization_id = o.id),
                ARRAY[]::varchar[]
              ) AS module_ids
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

// Precio mensual por plan en EUROS (espejo de PLANS en routes/stripe.js dividido /100).
// Lo duplicamos para no acoplar este controller a Stripe; si el catálogo de planes
// cambia, se actualizan ambos. Enterprise queda a precio nulo: no entra en MRR.
const PLAN_PRICE_EUR = { starter: 29, colegio: 149, enterprise: 0 };

// GET /superadmin/stats
// Construcción defensiva: cada query corre aislada con Promise.allSettled
// para que un fallo puntual (migración no aplicada en un entorno, BD vacía,
// etc.) no devuelva 500 ni vacíe la página entera. Las que fallen se loguean
// y se sustituyen por valor cero.
const getSuperadminStats = async (req, res) => {
  try {
    const safe = (rows, fallback = []) => Array.isArray(rows) ? rows : fallback;
    const settled = await Promise.allSettled([
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
      // Serie mensual últimos 12 meses (generate_series garantiza meses vacíos).
      query(
        `WITH months AS (
           SELECT date_trunc('month', NOW()) - (s || ' months')::interval AS month_start
             FROM generate_series(0, 11) s
         )
         SELECT to_char(m.month_start, 'YYYY-MM') AS bucket,
                COUNT(ul.id)::int                  AS count
           FROM months m
           LEFT JOIN usage_logs ul
             ON ul.created_at >= m.month_start
            AND ul.created_at <  m.month_start + INTERVAL '1 month'
          GROUP BY m.month_start
          ORDER BY m.month_start`
      ),
      // Serie anual últimos 3 años.
      query(
        `WITH years AS (
           SELECT date_trunc('year', NOW()) - (s || ' years')::interval AS year_start
             FROM generate_series(0, 2) s
         )
         SELECT to_char(y.year_start, 'YYYY') AS bucket,
                COUNT(ul.id)::int              AS count
           FROM years y
           LEFT JOIN usage_logs ul
             ON ul.created_at >= y.year_start
            AND ul.created_at <  y.year_start + INTERVAL '1 year'
          GROUP BY y.year_start
          ORDER BY y.year_start`
      ),
      // Top módulos del mes en curso, agregando cross-org.
      query(
        `SELECT COALESCE(ul.metadata->>'moduleId', ul.module::text) AS module_id,
                COALESCE(m.name, COALESCE(ul.metadata->>'moduleId', ul.module::text)) AS label,
                COUNT(*)::int AS count
           FROM usage_logs ul
           LEFT JOIN modules m ON m.id = COALESCE(ul.metadata->>'moduleId', ul.module::text)
          WHERE ul.created_at >= date_trunc('month', NOW())
          GROUP BY module_id, label
          ORDER BY count DESC
          LIMIT 8`
      ),
      // Top organizaciones por uso del mes en curso.
      query(
        `SELECT o.id, o.name, o.plan, COUNT(ul.id)::int AS count
           FROM organizations o
           JOIN usage_logs ul ON ul.organization_id = o.id
          WHERE ul.created_at >= date_trunc('month', NOW())
          GROUP BY o.id, o.name, o.plan
          ORDER BY count DESC
          LIMIT 8`
      ),
      // Top herramientas globales del mes — usa tool_key (catálogo Fase 1).
      // Para cuando la fila legacy no trae tool_key (Cambridge nativo, módulos
      // anteriores al catálogo), agrupamos también por action_type como
      // fallback con etiqueta humana derivada.
      // GROUP BY posicional (1,2,3,4) porque Postgres no acepta alias derivados
      // de COALESCE en GROUP BY estricto.
      query(
        `SELECT
            COALESCE(ul.tool_key, ul.action_type) AS tool_key,
            COALESCE(mt.name, ul.action_type)     AS label,
            COALESCE(ul.metadata->>'moduleId', ul.module::text) AS module_id,
            COALESCE(m.name, COALESCE(ul.metadata->>'moduleId', ul.module::text)) AS module_label,
            COUNT(*)::int AS count
           FROM usage_logs ul
           LEFT JOIN module_tools mt ON mt.key = ul.tool_key
           LEFT JOIN modules m ON m.id = COALESCE(ul.metadata->>'moduleId', ul.module::text)
          WHERE ul.created_at >= date_trunc('month', NOW())
            AND COALESCE(ul.tool_key, ul.action_type) IS NOT NULL
          GROUP BY 1, 2, 3, 4
          ORDER BY count DESC
          LIMIT 10`
      ),
      // Totales del mes actual vs mes anterior (mismo cálculo que org-stats,
      // pero sin filtrar por organization_id → agregado de toda la plataforma).
      query(
        `SELECT
           COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS current_month,
           COUNT(*) FILTER (
             WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
               AND created_at <  date_trunc('month', NOW())
           )::int AS previous_month
         FROM usage_logs`
      ),
      // Uso semanal del mes en curso (semanas 1..5 según día del mes).
      query(
        `SELECT
           LEAST(5, CEIL(EXTRACT(DAY FROM created_at)::int / 7.0))::int AS week,
           COUNT(*)::int AS count
         FROM usage_logs
         WHERE created_at >= date_trunc('month', NOW())
         GROUP BY week
         ORDER BY week`
      ),
      // Top profesores del mes en curso a nivel global (incluye nombre de su org).
      query(
        `SELECT u.id, u.name, u.email,
                u.organization_id, o.name AS organization_name,
                COUNT(*)::int AS total
           FROM usage_logs ul
           JOIN users u ON u.id = ul.user_id
           LEFT JOIN organizations o ON o.id = u.organization_id
          WHERE ul.created_at >= date_trunc('month', NOW())
          GROUP BY u.id, u.name, u.email, u.organization_id, o.name
          ORDER BY total DESC
          LIMIT 10`
      ),
    ]);

    const NAMES = [
      'orgs', 'users', 'usage', 'revenue',
      'monthlySeries', 'yearlySeries', 'topModules', 'topOrgs',
      'topTools', 'monthlyTotals', 'weeklyUsage', 'topTeachers',
    ];
    const rs = settled.map((s, i) => {
      if (s.status === 'fulfilled') return s.value;
      console.error(`getSuperadminStats — query "${NAMES[i]}" failed:`, s.reason?.message || s.reason);
      return { rows: [] };
    });
    const [
      orgsResult, usersResult, usageResult, revenueResult,
      monthlySeriesResult, yearlySeriesResult, topModulesResult, topOrgsResult,
      topToolsResult, monthlyTotalsResult, weeklyUsageResult, topTeachersResult,
    ] = rs;

    const totals = monthlyTotalsResult.rows[0] || { current_month: 0, previous_month: 0 };
    const deltaPct = totals.previous_month > 0
      ? Math.round(((totals.current_month - totals.previous_month) / totals.previous_month) * 100)
      : null;
    // Misma heurística que org-stats: cada generación ahorra ~15 min al profe.
    const hoursSaved = Math.round(totals.current_month * 0.25);

    // Promedios por colegio. El denominador es nº de orgs CON actividad
    // (un colegio dormido no aplasta el promedio del que sí usa la plataforma).
    let activity = { month: 0, year: 0, lifetime: 0, total_calls: 0, yearly_calls: 0 };
    try {
      const { rows } = await query(
        `SELECT
           COUNT(DISTINCT organization_id) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS month,
           COUNT(DISTINCT organization_id) FILTER (WHERE created_at >= date_trunc('year', NOW()))::int  AS year,
           COUNT(DISTINCT organization_id)::int AS lifetime,
           COUNT(*)::int AS total_calls,
           COUNT(*) FILTER (WHERE created_at >= date_trunc('year', NOW()))::int AS yearly_calls
         FROM usage_logs`
      );
      if (rows[0]) activity = rows[0];
    } catch (err) {
      console.error('getSuperadminStats — activity aggregate failed:', err.message);
    }

    const avg = (numerator, denominator) =>
      denominator > 0 ? Math.round((numerator / denominator) * 10) / 10 : 0;

    const totalActiveOrgs = Number(orgsResult.rows[0]?.active || 0);
    const totalUsers      = Number(usersResult.rows[0]?.total  || 0);

    const averages = {
      calls_per_org_month:    avg(totals.current_month,   activity.month),
      calls_per_org_year:     avg(activity.yearly_calls,  activity.year),
      calls_per_org_lifetime: avg(activity.total_calls,   activity.lifetime),
      teachers_per_org:       avg(totalUsers,             totalActiveOrgs),
      hours_saved_per_org:    avg(hoursSaved,             activity.month),
      orgs_with_activity_month:    activity.month,
      orgs_with_activity_year:     activity.year,
      orgs_with_activity_lifetime: activity.lifetime,
    };

    const lifetime = {
      total_calls:  activity.total_calls,
      yearly_calls: activity.yearly_calls,
      hours_saved:  Math.round(activity.total_calls * 0.25),
    };

    res.json({
      organizations: orgsResult.rows[0],
      users: usersResult.rows[0],
      usage: usageResult.rows[0],
      planBreakdown: revenueResult.rows,
      monthlySeries: monthlySeriesResult.rows,  // [{ bucket: 'YYYY-MM', count }]
      yearlySeries:  yearlySeriesResult.rows,   // [{ bucket: 'YYYY', count }]
      topModules:    topModulesResult.rows,     // [{ module_id, label, count }]
      topOrganizations: topOrgsResult.rows,     // [{ id, name, plan, count }]
      topTools:      topToolsResult.rows,       // [{ tool_key, label, module_id, module_label, count }]
      monthly: {
        current_month:  totals.current_month,
        previous_month: totals.previous_month,
        delta_pct:      deltaPct,
        hours_saved:    hoursSaved,
      },
      weeklyUsage:  weeklyUsageResult.rows,    // [{ week: 1..5, count }]
      topTeachers:  topTeachersResult.rows,    // [{ id, name, email, organization_id, organization_name, total }]
      averages,                                // { calls_per_org_month, calls_per_org_year, ... }
      lifetime,                                // { total_calls, yearly_calls, hours_saved }
    });
  } catch (err) {
    console.error('getSuperadminStats error:', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// GET /superadmin/billing
// MRR real = suma de (orgs activas × precio del plan). Histórico mensual y anual
// calculado tomando como referencia el conjunto de orgs vivas en cada mes (las
// que ya existían y siguen activas hoy — proxy suficiente sin tabla de
// suscripciones histórica). Facturas globales = listado sintético de los últimos
// 6 meses por org activa, coherente con el plan vigente (mismo modelo que
// /stripe/invoices a nivel org, pero agregado).
const getSuperadminBilling = async (req, res) => {
  try {
    const [orgsResult, monthlySeriesResult, yearlySeriesResult, planBreakdownResult] = await Promise.all([
      query(
        `SELECT id, name, plan, is_active, stripe_customer_id, created_at
           FROM organizations
          ORDER BY created_at DESC`
      ),
      // Para cada mes de los últimos 12: cuántas orgs activas existían (created_at <= fin de mes).
      query(
        `WITH months AS (
           SELECT date_trunc('month', NOW()) - (s || ' months')::interval AS month_start
             FROM generate_series(0, 11) s
         )
         SELECT to_char(m.month_start, 'YYYY-MM') AS bucket,
                COALESCE(SUM(
                  CASE o.plan
                    WHEN 'starter'    THEN ${PLAN_PRICE_EUR.starter}
                    WHEN 'colegio'    THEN ${PLAN_PRICE_EUR.colegio}
                    WHEN 'enterprise' THEN ${PLAN_PRICE_EUR.enterprise}
                    ELSE 0
                  END
                ), 0)::int AS mrr_eur,
                COUNT(o.id)::int AS active_orgs
           FROM months m
           LEFT JOIN organizations o
             ON o.is_active = true
            AND o.created_at < m.month_start + INTERVAL '1 month'
          GROUP BY m.month_start
          ORDER BY m.month_start`
      ),
      query(
        `WITH years AS (
           SELECT date_trunc('year', NOW()) - (s || ' years')::interval AS year_start
             FROM generate_series(0, 2) s
         )
         SELECT to_char(y.year_start, 'YYYY') AS bucket,
                COALESCE(SUM(
                  CASE o.plan
                    WHEN 'starter'    THEN ${PLAN_PRICE_EUR.starter}
                    WHEN 'colegio'    THEN ${PLAN_PRICE_EUR.colegio}
                    WHEN 'enterprise' THEN ${PLAN_PRICE_EUR.enterprise}
                    ELSE 0
                  END
                ), 0)::int * 12 AS arr_eur,
                COUNT(o.id)::int AS active_orgs
           FROM years y
           LEFT JOIN organizations o
             ON o.is_active = true
            AND o.created_at < y.year_start + INTERVAL '1 year'
          GROUP BY y.year_start
          ORDER BY y.year_start`
      ),
      query(
        `SELECT plan, COUNT(*)::int AS count
           FROM organizations
          WHERE is_active = true
          GROUP BY plan`
      ),
    ]);

    const orgs = orgsResult.rows;
    const activeOrgs = orgs.filter((o) => o.is_active);

    const mrr = activeOrgs.reduce((sum, o) => sum + (PLAN_PRICE_EUR[o.plan] || 0), 0);
    const arr = mrr * 12;

    // Facturas globales: por cada org activa, sus últimos 6 meses sintéticos.
    // Esto sustituye la tabla mock del frontend con datos derivados reales.
    const today = new Date();
    const invoices = [];
    activeOrgs.forEach((org) => {
      const price = PLAN_PRICE_EUR[org.plan] || 0;
      if (!price) return;
      for (let i = 0; i < 6; i += 1) {
        const issuedAt = new Date(today.getFullYear(), today.getMonth() - i, 1);
        // Sólo facturamos meses posteriores al alta de la org.
        if (issuedAt < new Date(org.created_at)) break;
        const isCurrent = i === 0;
        invoices.push({
          id: `vg_${org.id.slice(0, 8)}_${issuedAt.getFullYear()}_${String(issuedAt.getMonth() + 1).padStart(2, '0')}`,
          org_id: org.id,
          org_name: org.name,
          plan: org.plan,
          amount_eur: price,
          status: isCurrent ? 'open' : 'paid',
          issued_at: issuedAt.toISOString(),
          source: org.stripe_customer_id ? 'stripe' : 'demo',
        });
      }
    });
    invoices.sort((a, b) => new Date(b.issued_at) - new Date(a.issued_at));

    res.json({
      mrr_eur: mrr,
      arr_eur: arr,
      active_orgs: activeOrgs.length,
      total_orgs: orgs.length,
      planPrices: PLAN_PRICE_EUR,
      planBreakdown: planBreakdownResult.rows,
      monthlySeries: monthlySeriesResult.rows,  // [{ bucket, mrr_eur, active_orgs }]
      yearlySeries:  yearlySeriesResult.rows,   // [{ bucket, arr_eur, active_orgs }]
      invoices: invoices.slice(0, 60),          // últimas 60 transacciones globales
    });
  } catch (err) {
    console.error('getSuperadminBilling error:', err);
    res.status(500).json({ error: 'Error al obtener facturación global' });
  }
};

// GET /superadmin/billing/:orgId
// Facturación de una organización concreta — misma forma que getSuperadminBilling
// pero acotada a esa org. Permite al superadmin generar estadísticas y PDF por
// centro (mensual o anual).
const getSuperadminOrgBilling = async (req, res) => {
  try {
    const { orgId } = req.params;

    const orgResult = await query(
      `SELECT id, name, city, plan, is_active, stripe_customer_id, created_at
         FROM organizations WHERE id = $1`,
      [orgId]
    );
    const org = orgResult.rows[0];
    if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

    const price = PLAN_PRICE_EUR[org.plan] || 0;
    const monthlyMrr = org.is_active ? price : 0;

    // Para cada mes de los últimos 12: la org cobró `price` si en ese mes ya
    // existía y estaba activa. (No tenemos histórico de cancelaciones, así que
    // el "is_active" actual se proyecta sobre todos los meses posteriores al
    // alta. Si en el futuro guardas suscripciones reales esto se sustituye.)
    const [monthlyResult, yearlyResult] = await Promise.all([
      query(
        `WITH months AS (
           SELECT date_trunc('month', NOW()) - (s || ' months')::interval AS month_start
             FROM generate_series(0, 11) s
         )
         SELECT to_char(m.month_start, 'YYYY-MM') AS bucket,
                CASE
                  WHEN $2::timestamptz < m.month_start + INTERVAL '1 month' AND $3 = true
                  THEN ${price}
                  ELSE 0
                END::int AS mrr_eur,
                CASE
                  WHEN $2::timestamptz < m.month_start + INTERVAL '1 month' AND $3 = true
                  THEN 1 ELSE 0
                END::int AS active_orgs
           FROM months m
          ORDER BY m.month_start`,
        [orgId, org.created_at, org.is_active]
      ),
      query(
        `WITH years AS (
           SELECT date_trunc('year', NOW()) - (s || ' years')::interval AS year_start
             FROM generate_series(0, 2) s
         )
         SELECT to_char(y.year_start, 'YYYY') AS bucket,
                CASE
                  WHEN $2::timestamptz < y.year_start + INTERVAL '1 year' AND $3 = true
                  THEN ${price} * 12
                  ELSE 0
                END::int AS arr_eur,
                CASE
                  WHEN $2::timestamptz < y.year_start + INTERVAL '1 year' AND $3 = true
                  THEN 1 ELSE 0
                END::int AS active_orgs
           FROM years y
          ORDER BY y.year_start`,
        [orgId, org.created_at, org.is_active]
      ),
    ]);

    // Estadísticas de uso (mes en curso) reaprovechando usage_logs para que
    // el informe del centro sea útil más allá del importe puro.
    const usageResult = await query(
      `SELECT COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS monthly_calls,
              COUNT(*) FILTER (WHERE created_at >= date_trunc('year', NOW()))::int    AS yearly_calls,
              COUNT(DISTINCT user_id) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS active_teachers_month
         FROM usage_logs WHERE organization_id = $1`,
      [orgId]
    );

    // Facturas históricas sintéticas (últimos 12 meses). Si en el futuro
    // ingestas Stripe via webhook, sustituye esto por una query a tu tabla.
    const today = new Date();
    const invoices = [];
    if (price > 0) {
      for (let i = 0; i < 12; i += 1) {
        const issuedAt = new Date(today.getFullYear(), today.getMonth() - i, 1);
        if (issuedAt < new Date(org.created_at)) break;
        const isCurrent = i === 0;
        invoices.push({
          id: `vg_${org.id.slice(0, 8)}_${issuedAt.getFullYear()}_${String(issuedAt.getMonth() + 1).padStart(2, '0')}`,
          org_id: org.id,
          org_name: org.name,
          plan: org.plan,
          amount_eur: price,
          status: isCurrent ? 'open' : 'paid',
          issued_at: issuedAt.toISOString(),
          source: org.stripe_customer_id ? 'stripe' : 'demo',
        });
      }
    }

    const paidTotal    = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount_eur, 0);
    const pendingTotal = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount_eur, 0);

    res.json({
      scope: 'organization',
      org: {
        id: org.id, name: org.name, city: org.city,
        plan: org.plan, is_active: org.is_active,
        stripe_customer_id: org.stripe_customer_id,
        created_at: org.created_at,
      },
      mrr_eur: monthlyMrr,
      arr_eur: monthlyMrr * 12,
      active_orgs: org.is_active ? 1 : 0,
      total_orgs: 1,
      planPrices: PLAN_PRICE_EUR,
      planBreakdown: [{ plan: org.plan, count: 1 }],
      monthlySeries: monthlyResult.rows,
      yearlySeries:  yearlyResult.rows,
      invoices,
      totals: { paid_eur: paidTotal, pending_eur: pendingTotal },
      usage: usageResult.rows[0] || { monthly_calls: 0, yearly_calls: 0, active_teachers_month: 0 },
    });
  } catch (err) {
    console.error('getSuperadminOrgBilling error:', err);
    res.status(500).json({ error: 'Error al obtener facturación de la organización' });
  }
};

// GET /superadmin/users — listado global paginado, filtros por rol y organización.
const getSuperadminUsers = async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '', role, organizationId } = req.query;
    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    const where = [`(u.name ILIKE $1 OR u.email ILIKE $1)`];
    const values = [searchParam];
    let idx = 2;

    if (role) {
      where.push(`u.role = $${idx++}`);
      values.push(role);
    }
    if (organizationId) {
      where.push(`u.organization_id = $${idx++}`);
      values.push(organizationId);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    values.push(limit, offset);

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login, u.created_at,
              u.organization_id, o.name AS organization_name, o.plan AS organization_plan
         FROM users u
         LEFT JOIN organizations o ON o.id = u.organization_id
         ${whereSql}
         ORDER BY u.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereSql}`,
      values.slice(0, -2)
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error('getSuperadminUsers error:', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
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
  getSuperadminBilling,
  getSuperadminOrgBilling,
  getSuperadminUsers,
};
