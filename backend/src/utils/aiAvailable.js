// Detects whether a real Anthropic API key is configured.
// In demo mode (no key or placeholder) we fall back to local fixtures.
const aiAvailable = () => {
  const k = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!k) return false;
  if (k.includes('PLACEHOLDER')) return false;
  if (!k.startsWith('sk-ant-')) return false;
  if (k.length < 30) return false;
  return true;
};

module.exports = { aiAvailable };
