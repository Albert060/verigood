const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELS = {
  haiku: process.env.CLAUDE_HAIKU_MODEL || 'claude-haiku-4-5-20251001',
  sonnet: process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-6',
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
  const formattedMessages = Array.isArray(messages)
    ? messages
    : [{ role: 'user', content: messages }];

  const response = await client.messages.create({
    model: MODELS[model],
    max_tokens: maxTokens,
    system,
    messages: formattedMessages,
  });

  return response.content[0].text;
};

/**
 * Call Claude and parse JSON response — with auto-repair for malformed JSON
 */
const callClaudeJSON = async (opts) => {
  const text = await callClaude(opts);
  return parseJSON(text);
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

module.exports = { callClaude, callClaudeJSON, parseJSON, MODELS };
