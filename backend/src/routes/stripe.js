const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { notifyRole, notifySuperadmins, TYPES: NOTIF_TYPES } = require('../services/notifyService');

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

// Helper compartido entre GET /invoices y GET /invoices/:id. Si la org tiene
// stripe_customer_id real, consulta Stripe (PDF oficial vía invoice_pdf).
// Si no, devuelve un fixture coherente con la org y el plan en curso.
const listInvoicesForOrg = async ({ orgId, userEmail }) => {
  const orgResult = await query(
    `SELECT id, name, plan, stripe_customer_id, created_at
     FROM organizations WHERE id = $1`,
    [orgId]
  );
  const org = orgResult.rows[0];
  if (!org) return { invoices: [], source: 'demo', org: null };

  if (org.stripe_customer_id && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('PLACEHOLDER')) {
    try {
      const list = await stripe.invoices.list({ customer: org.stripe_customer_id, limit: 24 });
      const invoices = list.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          paid: inv.paid,
          amount_due: inv.amount_due,
          amount_paid: inv.amount_paid,
          subtotal: inv.subtotal,
          tax: inv.tax,
          total: inv.total,
          currency: inv.currency,
          created: inv.created ? new Date(inv.created * 1000).toISOString() : null,
          paid_at: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : null,
          due_date: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
          period_start: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          period_end: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          hosted_invoice_url: inv.hosted_invoice_url,
          invoice_pdf: inv.invoice_pdf,
          customer_name: inv.customer_name,
          customer_email: inv.customer_email,
          customer_address: inv.customer_address,
          customer_tax_ids: inv.customer_tax_ids,
          lines: (inv.lines?.data || []).map((l) => ({
            description: l.description,
            quantity: l.quantity,
            amount: l.amount,
            period_start: l.period?.start ? new Date(l.period.start * 1000).toISOString() : null,
            period_end:   l.period?.end   ? new Date(l.period.end   * 1000).toISOString() : null,
          })),
          source: 'stripe',
        }));
        return { invoices, source: 'stripe', org };
      } catch (stripeErr) {
        console.warn('stripe invoices.list failed, cayendo a fixture:', stripeErr.message);
      }
    }

    // Fallback: fixture coherente. Devuelve los últimos meses del plan actual.
    const planMeta = PLANS[org.plan] || PLANS.colegio;
    const monthly = planMeta.price || 14900; // céntimos
    const subtotal = Math.round(monthly / 1.21); // base imponible (IVA 21%)
    const tax = monthly - subtotal;

    const today = new Date();
    const invoices = Array.from({ length: 6 }, (_, i) => {
      const issuedAt = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const periodStart = new Date(issuedAt);
      const periodEnd = new Date(issuedAt.getFullYear(), issuedAt.getMonth() + 1, 0);
      const isCurrent = i === 0;
      return {
        id: `demo_${issuedAt.getFullYear()}_${String(issuedAt.getMonth() + 1).padStart(2, '0')}`,
        number: `VG-${issuedAt.getFullYear()}-${String(issuedAt.getMonth() + 1).padStart(2, '0')}-${String(req.user.organization_id).slice(0, 4).toUpperCase()}`,
        status: isCurrent ? 'open' : 'paid',
        paid: !isCurrent,
        amount_due: monthly,
        amount_paid: isCurrent ? 0 : monthly,
        subtotal,
        tax,
        total: monthly,
        currency: 'eur',
        created: issuedAt.toISOString(),
        paid_at: isCurrent ? null : new Date(issuedAt.getTime() + 24 * 3600 * 1000).toISOString(),
        due_date: new Date(issuedAt.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        hosted_invoice_url: null,
        invoice_pdf: null,
        customer_name: org.name,
        customer_email: userEmail,
        customer_address: null,
        customer_tax_ids: [],
        lines: [{
          description: `VeriGood ${planMeta.name} — ${issuedAt.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
          quantity: 1,
          amount: monthly,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        }],
        source: 'demo',
      };
    });

  return { invoices, source: 'demo', org };
};

// GET /stripe/invoices — lista de facturas de la organización
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const { invoices, source } = await listInvoicesForOrg({
      orgId: req.user.organization_id,
      userEmail: req.user.email,
    });
    res.json({ invoices, source });
  } catch (err) {
    console.error('list invoices error:', err);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
});

// GET /stripe/invoices/:id — detalle de una factura concreta (para PDF)
router.get('/invoices/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { invoices, org } = await listInvoicesForOrg({
      orgId: req.user.organization_id,
      userEmail: req.user.email,
    });
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json({ invoice: { ...inv, customer_name: inv.customer_name || org?.name } });
  } catch (err) {
    console.error('get invoice error:', err);
    res.status(500).json({ error: 'Error al obtener la factura' });
  }
});

// (Endpoints de gestión de suscripción eliminados — checkout, portal,
//  status, subscription/cancel, subscription/resume. El cliente activa la IA
//  con su propia clave de Anthropic vía /api/organizations/:orgId/anthropic.
//  Solo quedan plans, invoices y webhook para mostrar histórico y recibir
//  eventos de Stripe en caso de integraciones futuras.)

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
        await notifyRole({
          organizationId: orgId,
          role: 'admin_centro',
          type: NOTIF_TYPES.INVOICE_PAID,
          title: `Plan ${PLANS[plan]?.name || plan} activado`,
          body: 'Tu suscripción está activa. Ya puedes acceder a todas las funcionalidades del plan.',
          link: '/dashboard/billing',
          metadata: { plan, sessionId: session.id },
        });
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const { rows } = await query(
          `SELECT id FROM organizations WHERE stripe_customer_id = $1`,
          [invoice.customer]
        );
        if (rows[0]) {
          await notifyRole({
            organizationId: rows[0].id,
            role: 'admin_centro',
            type: NOTIF_TYPES.INVOICE_PAID,
            title: `Factura ${invoice.number || ''} pagada`,
            body: `Importe: ${((invoice.amount_paid || 0) / 100).toLocaleString('es-ES')} €`,
            link: '/dashboard/billing',
            metadata: { invoiceId: invoice.id, number: invoice.number },
          });
          // Espejo al panel global del superadmin.
          await notifySuperadmins({
            type: NOTIF_TYPES.INVOICE_PAID,
            title: `Factura pagada · ${invoice.number || ''}`,
            body: `${((invoice.amount_paid || 0) / 100).toLocaleString('es-ES')} € · org ${rows[0].id.slice(0, 8)}`,
            link: '/superadmin/billing',
            metadata: { invoiceId: invoice.id, number: invoice.number, orgId: rows[0].id },
          });
        }
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
