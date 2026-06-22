// Detects whether a real Stripe secret key is configured.
// Mismo patrón que aiAvailable: cuando es false, la UI de facturación
// degrada elegantemente a fixtures + CTAs deshabilitados.
const stripeAvailable = () => {
  const k = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!k) return false;
  if (k.includes('PLACEHOLDER')) return false;
  if (!k.startsWith('sk_')) return false;
  if (k.length < 20) return false;
  return true;
};

module.exports = { stripeAvailable };
