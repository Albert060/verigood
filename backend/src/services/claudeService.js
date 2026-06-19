const Anthropic = require('@anthropic-ai/sdk');
const { AsyncLocalStorage } = require('async_hooks');
const { aiAvailable } = require('../utils/aiAvailable');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Convierte errores de la SDK de Anthropic en errores con un `code` estable
// que el dispatcher de tools mapea a status HTTP + mensaje en español. Sin esto
// el body crudo de Anthropic (`{"type":"error",...}`) llegaba al frontend.
const mapAnthropicError = (err) => {
  const status = err?.status || err?.response?.status;
  if (status === 401 || status === 403) {
    const wrapped = new Error('La clave de la API de IA no es válida o está caducada.');
    wrapped.code = 'AI_INVALID_KEY';
    wrapped.cause = err;
    return wrapped;
  }
  if (status === 429) {
    const wrapped = new Error('Has alcanzado el límite de la API de IA. Espera unos segundos.');
    wrapped.code = 'AI_RATE_LIMITED';
    wrapped.cause = err;
    return wrapped;
  }
  if (status === 529 || (status >= 500 && status < 600)) {
    const wrapped = new Error('La API de IA está temporalmente saturada. Reintenta en unos segundos.');
    wrapped.code = 'AI_UNAVAILABLE';
    wrapped.cause = err;
    return wrapped;
  }
  return err;
};

const MODELS = {
  haiku: process.env.CLAUDE_HAIKU_MODEL || 'claude-haiku-4-5-20251001',
  sonnet: process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-6',
};

// Recolector de uso por petición HTTP. El dispatcher de tools envuelve la
// invocación del handler en runWithUsageCapture(); cada llamada a callClaude
// dentro de ese ámbito acumula tokens en el bucket. Si un handler hace varias
// llamadas, se suman. Si no se invoca dentro del ámbito, se ignora.
const usageStore = new AsyncLocalStorage();

const runWithUsageCapture = async (fn) => {
  const bucket = { input_tokens: 0, output_tokens: 0, calls: 0, models: [] };
  return usageStore.run(bucket, async () => {
    const result = await fn();
    return { result, usage: bucket };
  });
};

const recordUsage = (modelId, usage) => {
  const bucket = usageStore.getStore();
  if (!bucket || !usage) return;
  bucket.input_tokens  += usage.input_tokens  || 0;
  bucket.output_tokens += usage.output_tokens || 0;
  bucket.calls += 1;
  if (modelId && !bucket.models.includes(modelId)) bucket.models.push(modelId);
};

/**
 * Core Claude call — returns text content
 * @param {object} opts
 * @param {string} opts.system
 * @param {string|array} opts.messages
 * @param {'haiku'|'sonnet'} opts.model
 * @param {number} opts.maxTokens
 */
const callClaude = async ({ system, messages, model = 'haiku', maxTokens = 2048 }) => {
  // Cortocircuito en modo demo (sin key o key placeholder). Antes esto solo
  // se comprobaba en algunos servicios (Cambridge); ahora afecta a CUALQUIER
  // handler que pase por aquí.
  if (!aiAvailable()) {
    const err = new Error('La integración con la API de IA no está configurada en este entorno.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const formattedMessages = Array.isArray(messages)
    ? messages
    : [{ role: 'user', content: messages }];

  const modelId = MODELS[model];
  let response;
  try {
    response = await client.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      system,
      messages: formattedMessages,
    });
  } catch (err) {
    throw mapAnthropicError(err);
  }

  recordUsage(modelId, response.usage);
  return response.content[0].text;
};

/**
 * Call Claude and parse JSON response — with auto-repair for malformed JSON.
 * Si tras los intentos de reparación seguimos sin JSON válido, lanzamos
 * un error con code='BAD_AI_RESPONSE' para que el dispatcher lo mapee a 502.
 */
const callClaudeJSON = async (opts) => {
  const text = await callClaude(opts);
  try {
    return parseJSON(text);
  } catch (err) {
    const wrapped = new Error('La IA devolvió una respuesta no parseable como JSON.');
    wrapped.code = 'BAD_AI_RESPONSE';
    wrapped.cause = err;
    wrapped.preview = String(text).slice(0, 200);
    throw wrapped;
  }
};

/**
 * Robust JSON parser — handles markdown code blocks and trailing commas
 */
const parseJSON = (text) => {
  // Strip markdown code blocks
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Try to extract JSON object/array
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (_2) {
        // Remove trailing commas before } or ]
        const repaired = match[1]
          .replace(/,\s*([\]}])/g, '$1')
          .replace(/,\s*$/gm, '');
        return JSON.parse(repaired);
      }
    }
    throw new Error(`No se pudo parsear JSON: ${text.slice(0, 100)}`);
  }
};

module.exports = {
  callClaude,
  callClaudeJSON,
  parseJSON,
  MODELS,
  runWithUsageCapture,
};
