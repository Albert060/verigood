// Detects whether a real Anthropic API key is configured.
// En modo demo (no key o placeholder) se cae a fixtures locales.
//
// Acepta una clave opcional como argumento. Si se pasa, se valida ESA clave.
// Si no se pasa, mira `process.env.ANTHROPIC_API_KEY` (legacy / dev / tests).
//
// En producción cada org tiene su propia clave en BD (cifrada) y el dispatcher
// la pasa explícita aquí; la del env queda como fallback de entornos de prueba.
const aiAvailable = (explicitKey) => {
  // Trata null y undefined por igual como "no se pasó clave". El ternario
  // anterior solo comprobaba undefined, así que aiAvailable(null) — típico
  // cuando la org no tiene clave configurada — daba null.trim() → TypeError.
  const raw = (explicitKey == null ? process.env.ANTHROPIC_API_KEY : explicitKey) || '';
  const k = String(raw).trim();
  if (!k) return false;
  if (k.includes('PLACEHOLDER')) return false;
  if (!k.startsWith('sk-ant-')) return false;
  if (k.length < 30) return false;
  return true;
};

module.exports = { aiAvailable };
