const { query } = require('../config/database');
const toolsRegistry = require('../services/tools');
const { runWithUsageCapture } = require('../services/claudeService');

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
      `SELECT t.input_schema, t.default_model, m.stage
       FROM module_tool_bindings b
       JOIN module_tools t ON t.key = b.tool_key
       JOIN modules m       ON m.id = b.module_id
       WHERE b.module_id = $1 AND b.tool_key = $2 AND t.is_available = true`,
      [moduleId, toolKey]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Herramienta no vinculada a este módulo', code: 'TOOL_NOT_BOUND' });
    }
    const { input_schema, default_model, stage } = rows[0];

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

    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = { listForModule, run };
