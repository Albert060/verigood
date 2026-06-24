// Detects whether a real Anthropic API key is configured.
// En modo demo (no key o placeholder) se cae a fixtures locales.
//
// Acepta una clave opcional como argumento. Si se pasa, se valida ESA clave.
// Si no se pasa, mira `process.env.ANTHROPIC_API_KEY` (legacy / dev / tests).
//
// En producción cada org tiene su propia clave en BD (cifrada) y el dispatcher
// la pasa explícita aquí; la del env queda como fallback de entornos de prueba.
const aiAvailable = (explicitKey) => {
  const k = (explicitKey !== undefined ? explicitKey : process.env.ANTHROPIC_API_KEY || '').trim();
  if (!k) return false;
  if (k.includes('PLACEHOLDER')) return false;
  if (!k.startsWith('sk-ant-')) return false;
  if (k.length < 30) return false;
  return true;
};

module.exports = { aiAvailable };
