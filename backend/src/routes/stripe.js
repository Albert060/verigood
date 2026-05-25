const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

const PLANS = {
  starter: {
    name: 'Starter',
    price: 2900,
    priceId: process.env.STRIPE_PRICE_STARTER,
    features: ['1 profesor', '50 exámenes/mes', '100 correcciones OCR'],
  },
  colegio: {
    name: 'Colegio',
    price: 14900,
    priceId: process.env.STRIPE_PRICE_COLEGIO,
    features: ['Hasta 15 profesores', 'Exámenes ilimitados', 'OCR ilimitado', 'Dashboard admin', 'Biblioteca compartida'],
  },
  enterprise: {
    name: 'Enterprise',
    price: null,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE,
    features: ['Profesores ilimitados', 'Multi-sede', 'SSO / LMS', 'BD de preguntas propia', 'API access'],
  },
};

// GET /stripe/plans
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

// POST /stripe/checkout — create checkout session
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Plan no válido' });

    const orgResult = await query('SELECT stripe_customer_id FROM organizations WHERE id = $1', [
      req.user.organization_id,
    ]);
    const org = orgResult.rows[0];

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.org_name,
        metadata: { orgId: req.user.organization_id },
      });
      customerId = customer.id;
      await query('UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2', [
        customerId,
        req.user.organization_id,
      ]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=true`,
      metadata: { orgId: req.user.organization_id, plan },
      locale: 'es',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('checkout error:', err);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

// POST /stripe/portal — billing portal
router.post('/portal', authenticate, async (req, res) => {
  try {
    const orgResult = await query('SELECT stripe_customer_id FROM organizations WHERE id = $1', [
      req.user.organization_id,
    ]);
    const customerId = orgResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'No hay suscripción activa' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Error al abrir el portal de facturación' });
  }
});

// POST /stripe/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { orgId, plan } = session.metadata;
        await query(
          `UPDATE organizations SET plan = $1, stripe_customer_id = $2, is_active = true, updated_at = NOW()
           WHERE id = $3`,
          [plan, session.customer, orgId]
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await query(
          `UPDATE organizations SET plan = 'starter', updated_at = NOW()
           WHERE stripe_customer_id = $1`,
          [sub.customer]
        );
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn('Payment failed for customer:', invoice.customer);
        break;
      }
    }
  } catch (err) {
    console.error('webhook handler error:', err);
  }

  res.json({ received: true });
});

module.exports = router;
