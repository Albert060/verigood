const { query } = require('../config/database');
const toolsRegistry = require('../services/tools');
const { runWithUsageCapture } = require('../services/claudeService');
const { aiAvailable } = require('../utils/aiAvailable');
const demoFixtures = require('../services/tools/demoFixtures');
const { notify, TYPES: NOTIF_TYPES } = require('../services/notifyService');

// GET /api/modules/:moduleId/tools
// Lista las herramientas vinculadas al módulo, en orden.
const listForModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Comprobar que el módulo existe (mejor 404 que devolver lista vacía silenciosa).
    const mod = await query(`SELECT id FROM modules WHERE id = $1`, [moduleId]);
    if (!mod.rows.length) {
      return res.status(404).json({ error: 'Módulo no encontrado', code: 'MODULE_NOT_FOUND' });
    }

    const { rows } = await query(
      `SELECT t.key, t.name, t.description, t.output_kind, t.input_schema,
              t.default_model, b.sort_order
       FROM module_tool_bindings b
       JOIN module_tools t ON t.key = b.tool_key
       WHERE b.module_id = $1 AND t.is_available = true
       ORDER BY b.sort_order, t.name`,
      [moduleId]
    );

    res.json({ moduleId, tools: rows });
  } catch (err) {
    console.error('listForModule error:', err);
    res.status(500).json({ error: 'Error al obtener herramientas del módulo' });
  }
};

// Construye un título legible para el library_item a partir del input del
// profesor: prioriza topic/theme/focus si vienen, si no usa solo el nombre.
const buildAutoTitle = (toolName, input) => {
  const candidates = ['topic','theme','focus','concept','sentence','work','skill','content_block','goal','situation','prompt_or_text','text_or_reference','work_or_reference'];
  for (const k of candidates) {
    const v = input?.[k];
    if (typeof v === 'string' && v.trim()) {
      return `${toolName} · ${v.trim().slice(0, 60)}`;
    }
  }
  const course = input?.course || input?.level;
  return course ? `${toolName} · ${course}` : toolName;
};

// Persiste el resultado en library_items para que aparezca en la Biblioteca
// del centro. Best-effort: si la tabla no existe (migración 004 pendiente) o
// hay cualquier problema, lo registramos pero NO rompemos la respuesta de la
// herramienta — el profesor sigue viendo su resultado.
const autoSaveToLibrary = async ({ moduleId, toolKey, toolName, kind, payload, input, userId, orgId }) => {
  try {
    await query(
      `INSERT INTO library_items
         (organization_id, teacher_id, module_id, tool_key, kind, title, payload, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        orgId,
        userId,
        moduleId,
        toolKey,
        kind,
        buildAutoTitle(toolName, input),
        JSON.stringify(payload),
        JSON.stringify({ input, toolName, autoSaved: true }),
      ]
    );
  } catch (err) {
    if (err.code === '42P01') {
      console.warn('library_items: tabla no existe. Pasa la migración 004 para que la biblioteca capture las generaciones.');
    } else {
      console.warn('library auto-save failed (non-fatal):', err.message);
    }
  }
};

// Validación ligera del input contra tool.input_schema.
// Soporta los tipos usados en el seed: text, textarea, select, number.
const validateInput = (input, schema) => {
  const errors = [];
  const fields = (schema && schema.fields) || [];

  for (const f of fields) {
    const v = input[f.key];
    const present = v !== undefined && v !== null && v !== '';

    if (f.required && !present) {
      errors.push({ field: f.key, error: 'REQUIRED' });
      continue;
    }
    if (!present) continue;

    if (f.type === 'number') {
      const n = Number(v);
      if (Number.isNaN(n)) {
        errors.push({ field: f.key, error: 'NOT_A_NUMBER' });
      } else {
        if (typeof f.min === 'number' && n < f.min) errors.push({ field: f.key, error: 'BELOW_MIN', min: f.min });
        if (typeof f.max === 'number' && n > f.max) errors.push({ field: f.key, error: 'ABOVE_MAX', max: f.max });
      }
    } else if (f.type === 'select') {
      if (Array.isArray(f.options) && !f.options.includes(v)) {
        errors.push({ field: f.key, error: 'INVALID_OPTION' });
      }
    } else if (f.type === 'text' || f.type === 'textarea') {
      if (typeof v !== 'string') errors.push({ field: f.key, error: 'NOT_A_STRING' });
    }
  }
  return errors;
};

// POST /api/modules/:moduleId/tools/:toolKey/run
// Body: { input: { ... } }
// Devuelve: { output_kind, output }
const run = async (req, res, next) => {
  try {
    const { moduleId, toolKey } = req.params;
    const input = (req.body && req.body.input) || {};

    // Cargar binding + tool + stage del módulo en una sola query.
    const { rows } = await query(
      `SELECT t.name, t.input_schema, t.output_kind, t.default_model, m.stage
       FROM module_tool_bindings b
       JOIN module_tools t ON t.key = b.tool_key
       JOIN modules m       ON m.id = b.module_id
       WHERE b.module_id = $1 AND b.tool_key = $2 AND t.is_available = true`,
      [moduleId, toolKey]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Herramienta no vinculada a este módulo', code: 'TOOL_NOT_BOUND' });
    }
    const { name: toolName, input_schema, output_kind, default_model, stage } = rows[0];

    const validationErrors = validateInput(input, input_schema);
    if (validationErrors.length) {
      return res.status(400).json({ error: 'Entrada inválida', code: 'INVALID_INPUT', details: validationErrors });
    }

    const ctx = {
      moduleId,
      stage,
      userId: req.user.id,
      orgId:  req.user.organization_id,
      model:  default_model,
    };

    // Modo demo: si no hay clave de IA válida, devolvemos un fixture genérico
    // según el output_kind declarado en BD. Así CUALQUIER tool del catálogo
    // entra en modo demo automáticamente — mismo comportamiento que Cambridge.
    if (!aiAvailable()) {
      const demo = demoFixtures.forKind(output_kind, {
        input,
        tool: { key: toolKey, name: toolName },
        moduleId,
      });
      if (demo) {
        return res.json({ ...demo, demo: true });
      }
      // output_kind sin generador → seguimos como antes (saltará AI_NOT_CONFIGURED).
    }

    let result, usage;
    try {
      const captured = await runWithUsageCapture(() =>
        toolsRegistry.run(toolKey, input, ctx)
      );
      result = captured.result;
      usage  = captured.usage;
    } catch (err) {
      if (err.code === 'TOOL_NOT_IMPLEMENTED') {
        return res.status(501).json({
          error: 'Herramienta declarada pero aún sin implementación',
          code: 'TOOL_NOT_IMPLEMENTED',
          tool: toolKey,
        });
      }
      if (err.code === 'BAD_AI_RESPONSE') {
        console.warn(`BAD_AI_RESPONSE on ${toolKey}:`, err.preview);
        return res.status(502).json({
          error: 'La IA devolvió un resultado no válido. Vuelve a intentarlo en unos segundos.',
          code: 'BAD_AI_RESPONSE',
          tool: toolKey,
        });
      }
      if (err.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({
          error: 'La integración con la API de IA no está configurada en este entorno. Pide al administrador del centro que configure ANTHROPIC_API_KEY en el servidor.',
          code: 'AI_NOT_CONFIGURED',
        });
      }
      if (err.code === 'AI_INVALID_KEY') {
        console.error('AI_INVALID_KEY: la clave de Anthropic no es válida');
        return res.status(503).json({
          error: 'La clave de la API de IA no es válida. Pide al administrador del centro que la actualice.',
          code: 'AI_INVALID_KEY',
        });
      }
      if (err.code === 'AI_RATE_LIMITED') {
        return res.status(429).json({
          error: 'Has alcanzado el límite de la API de IA. Espera unos segundos.',
          code: 'AI_RATE_LIMITED',
        });
      }
      if (err.code === 'AI_UNAVAILABLE') {
        return res.status(502).json({
          error: 'La API de IA está temporalmente saturada. Reintenta en unos segundos.',
          code: 'AI_UNAVAILABLE',
        });
      }
      throw err;
    }

    // Log de consumo (best-effort; no debe romper la respuesta).
    try {
      const totalTokens = (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
      await query(
        `INSERT INTO usage_logs (user_id, organization_id, module, action_type, tool_key, tokens_used, metadata)
         VALUES ($1, $2, $3::module_type, $4, $5, $6, $7::jsonb)`,
        [
          ctx.userId,
          ctx.orgId,
          // El enum legacy module_type sólo admite valores antiguos. Para tools
          // del catálogo nuevo, marcamos 'cambridge' como placeholder y dejamos
          // el moduleId real en metadata. Se limpia con la migración 004.
          'cambridge',
          `tool:${toolKey}`,
          toolKey,
          totalTokens,
          JSON.stringify({
            moduleId,
            stage,
            input_tokens:  usage?.input_tokens  || 0,
            output_tokens: usage?.output_tokens || 0,
            ai_calls:      usage?.calls         || 0,
            models:        usage?.models        || [],
          }),
        ]
      );
    } catch (logErr) {
      console.warn('usage_logs insert failed (non-fatal):', logErr.message);
    }

    // Auto-persistencia en la biblioteca del centro. Best-effort: si falla,
    // el profesor sigue viendo su resultado. La biblioteca lo recoge sola.
    if (result && result.output_kind && result.output) {
      await autoSaveToLibrary({
        moduleId,
        toolKey,
        toolName,
        kind: result.output_kind,
        payload: result.output,
        input,
        userId: ctx.userId,
        orgId:  ctx.orgId,
      });

      // Notificación in-app al profesor para que pueda volver a su recurso.
      await notify({
        userId: ctx.userId,
        organizationId: ctx.orgId,
        type: NOTIF_TYPES.TOOL_GENERATED,
        title: `Recurso generado: ${toolName}`,
        body: 'Tu nuevo recurso ya está disponible en la biblioteca del centro.',
        link: '/dashboard/resources',
        metadata: { moduleId, toolKey, kind: result.output_kind },
      });
    }

    res.json({ ...result, autoSaved: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { listForModule, run };
