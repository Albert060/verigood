import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { stripeApi, pdfApi } from '../../services/api';
import { PageHeader, Button, SectionLabel } from '../../components/ui';

const fmtEUR = (cents, currency = 'eur') => {
  if (cents == null) return '—';
  const amount = (cents / 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return `${amount} ${currency.toUpperCase() === 'EUR' ? '€' : currency.toUpperCase()}`;
};

const STATUS_LABEL = {
  paid: 'PAGADA',
  open: 'PENDIENTE',
  draft: 'BORRADOR',
  uncollectible: 'INCOBRABLE',
  void: 'ANULADA',
};

// Facturas de ejemplo precargadas. Sirven dos propósitos:
//   1. Tener algo que mostrar/descargar mientras el backend o Stripe no estén
//      conectados (entorno demo, pre-lanzamiento, primer arranque).
//   2. Documentar la forma exacta que espera renderInvoice del pdfService.
// Si el backend devuelve facturas, las suyas tienen prioridad.
const FALLBACK_INVOICES = [
  {
    id: 'sample_2026_04', number: 'VG-2026-04-DEMO',
    status: 'paid', paid: true,
    amount_due: 14900, amount_paid: 14900,
    subtotal: 12314, tax: 2586, total: 14900, currency: 'eur',
    created:      '2026-04-01T08:00:00Z',
    paid_at:      '2026-04-01T10:14:00Z',
    due_date:     '2026-04-08T08:00:00Z',
    period_start: '2026-04-01T00:00:00Z',
    period_end:   '2026-04-30T23:59:59Z',
    customer_name: 'Colegio San Isidro',
    customer_email: 'admin@verigood.com',
    customer_address: { line1: 'Calle Alcalá, 100', postal_code: '28009', city: 'Madrid', country: 'ES' },
    customer_tax_ids: [{ value: 'B12345678' }],
    lines: [{ description: 'VeriGood Colegio — abril 2026', quantity: 1, amount: 14900,
              period_start: '2026-04-01T00:00:00Z', period_end: '2026-04-30T23:59:59Z' }],
  },
  {
    id: 'sample_2026_03', number: 'VG-2026-03-DEMO',
    status: 'paid', paid: true,
    amount_due: 14900, amount_paid: 14900,
    subtotal: 12314, tax: 2586, total: 14900, currency: 'eur',
    created:      '2026-03-01T08:00:00Z',
    paid_at:      '2026-03-01T09:08:00Z',
    due_date:     '2026-03-08T08:00:00Z',
    period_start: '2026-03-01T00:00:00Z',
    period_end:   '2026-03-31T23:59:59Z',
    customer_name: 'Colegio San Isidro',
    customer_email: 'admin@verigood.com',
    customer_address: { line1: 'Calle Alcalá, 100', postal_code: '28009', city: 'Madrid', country: 'ES' },
    customer_tax_ids: [{ value: 'B12345678' }],
    lines: [{ description: 'VeriGood Colegio — marzo 2026', quantity: 1, amount: 14900,
              period_start: '2026-03-01T00:00:00Z', period_end: '2026-03-31T23:59:59Z' }],
  },
  {
    id: 'sample_2026_02', number: 'VG-2026-02-DEMO',
    status: 'paid', paid: true,
    amount_due: 14900, amount_paid: 14900,
    subtotal: 12314, tax: 2586, total: 14900, currency: 'eur',
    created:      '2026-02-01T08:00:00Z',
    paid_at:      '2026-02-01T08:42:00Z',
    due_date:     '2026-02-08T08:00:00Z',
    period_start: '2026-02-01T00:00:00Z',
    period_end:   '2026-02-28T23:59:59Z',
    customer_name: 'Colegio San Isidro',
    customer_email: 'admin@verigood.com',
    customer_address: { line1: 'Calle Alcalá, 100', postal_code: '28009', city: 'Madrid', country: 'ES' },
    customer_tax_ids: [{ value: 'B12345678' }],
    lines: [{ description: 'VeriGood Colegio — febrero 2026', quantity: 1, amount: 14900,
              period_start: '2026-02-01T00:00:00Z', period_end: '2026-02-28T23:59:59Z' }],
  },
  {
    id: 'sample_2026_01', number: 'VG-2026-01-DEMO',
    status: 'paid', paid: true,
    amount_due: 14900, amount_paid: 14900,
    subtotal: 12314, tax: 2586, total: 14900, currency: 'eur',
    created:      '2026-01-01T08:00:00Z',
    paid_at:      '2026-01-01T11:31:00Z',
    due_date:     '2026-01-08T08:00:00Z',
    period_start: '2026-01-01T00:00:00Z',
    period_end:   '2026-01-31T23:59:59Z',
    customer_name: 'Colegio San Isidro',
    customer_email: 'admin@verigood.com',
    customer_address: { line1: 'Calle Alcalá, 100', postal_code: '28009', city: 'Madrid', country: 'ES' },
    customer_tax_ids: [{ value: 'B12345678' }],
    lines: [{ description: 'VeriGood Colegio — enero 2026', quantity: 1, amount: 14900,
              period_start: '2026-01-01T00:00:00Z', period_end: '2026-01-31T23:59:59Z' }],
  },
];

export default function InstitutionalBilling() {
  const navigate = useNavigate();
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: invoicesResp, isLoading: loadingInvoices, isError } = useQuery({
    queryKey: ['stripe-invoices'],
    queryFn: () => stripeApi.getInvoices().then((r) => r.data),
    retry: false,
  });

  // Si el backend responde con facturas, ganan. Si no responde, falla o devuelve
  // lista vacía, usamos las precargadas como ejemplo descargable.
  const backendInvoices = invoicesResp?.invoices || [];
  const usingFallback = !loadingInvoices && (isError || backendInvoices.length === 0);
  const invoices = usingFallback ? FALLBACK_INVOICES : backendInvoices;
  const source = usingFallback ? 'sample' : invoicesResp?.source;

  const lastPaid = useMemo(
    () => invoices.find((i) => i.paid) || invoices[0],
    [invoices]
  );

  // El CTA "Gestionar suscripción" abre nuestra propia página de gestión
  // (/dashboard/billing/manage), que internamente delega en Stripe (portal /
  // checkout) o degrada a CTAs deshabilitados si Stripe no está configurado.
  const goToManage = () => navigate('/dashboard/billing/manage');

  // Reglas de descarga, en este orden:
  //   1. Si trae invoice_pdf (Stripe real) → abrimos el PDF oficial.
  //   2. Si es fallback local (sample_*) → generamos PDF directamente con sus datos.
  //   3. Si viene del backend → pedimos detalle por id y generamos PDF.
  const downloadInvoicePdf = async (inv) => {
    if (inv.invoice_pdf) {
      window.open(inv.invoice_pdf, '_blank', 'noopener,noreferrer');
      return;
    }
    setDownloadingId(inv.id);
    try {
      const isSample = typeof inv.id === 'string' && inv.id.startsWith('sample_');
      const full = isSample
        ? inv
        : await stripeApi.getInvoice(inv.id).then((r) => r.data.invoice);

      await pdfApi.download({
        type: 'invoice',
        data: full,
        title: `Factura ${full.number || full.id}`,
        subtitle: full.customer_name || '',
        moduleKey: 'cambridge', // accent marino — neutro para facturas
        filename: `factura-${(full.number || full.id).toString().replace(/\W+/g, '-')}`,
      });
    } catch (e) {
      console.error('Error descargando PDF factura', e);
      window.alert('No se pudo generar el PDF de la factura.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="animate-slide-in">
      <PageHeader title="Facturación" subtitle="PLAN Y PAGOS" romanNum="§ VI" />

      {/* Current plan */}
      <div className="bg-card-bg border-2 border-marino shadow-card p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[10px] text-marron-soft tracking-[0.08em] mb-1">PLAN ACTUAL</div>
            <div className="font-display text-[22px] font-bold text-marino mb-1">Colegio</div>
            <div className="font-mono text-[24px] text-tinta">149 <span className="text-[13px] text-marron-soft">€/mes · IVA incl.</span></div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-marron-soft mb-1">PRÓXIMO COBRO</div>
            <div className="font-mono text-[13px] text-tinta">
              {lastPaid?.period_end ? new Date(lastPaid.period_end).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            </div>
            <div className="font-mono text-[10px] text-marron-soft mt-3 mb-1">MÉTODO DE PAGO</div>
            <div className="font-mono text-[12px] text-tinta">{source === 'stripe' ? 'Gestionado en Stripe' : 'Visa •••• 4242'}</div>
          </div>
        </div>

        <hr className="border-linea opacity-40 my-4" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel className="mb-2">INCLUIDO EN TU PLAN</SectionLabel>
            <div className="space-y-1">
              {['Hasta 15 profesores', 'Exámenes ilimitados', 'OCR ilimitado', 'Todos los módulos', 'Dashboard admin', 'Biblioteca compartida'].map((f) => (
                <div key={f} className="flex items-center gap-2 text-[12px] text-marron-soft">
                  <span className="text-[#2D6A4F]">—</span> {f}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end justify-end gap-2">
            <Button onClick={goToManage}>
              Gestionar suscripción
            </Button>
            <p className="font-mono text-[10px] text-marron-soft text-right">Cambia plan, actualiza pago o cancela</p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-card-bg border border-linea shadow-card">
        <div className="px-4 py-3 border-b border-linea flex items-center justify-between">
          <SectionLabel className="mb-0">HISTORIAL DE FACTURAS</SectionLabel>
          {source === 'demo' && (
            <span className="font-mono text-[10px] text-marron-soft">
              Datos de muestra · activa Stripe en producción para histórico real
            </span>
          )}
          {source === 'sample' && (
            <span className="font-mono text-[10px] text-marron-soft">
              Facturas de ejemplo precargadas · pulsa PDF para ver el formato
            </span>
          )}
        </div>

        {loadingInvoices && (
          <div className="h-32 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingInvoices && invoices.length === 0 && (
          <div className="px-4 py-8 text-center font-mono text-[11px] text-marron-soft">
            No hay facturas todavía.
          </div>
        )}

        {!loadingInvoices && invoices.length > 0 && (
          <div className="divide-y divide-[rgba(184,169,136,0.3)]">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 px-4 py-3">
                <span className="font-mono text-[11px] text-marron-soft w-24 flex-shrink-0">
                  {inv.created ? new Date(inv.created).toLocaleDateString('es') : '—'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-tinta truncate">
                    {inv.lines?.[0]?.description || `Factura ${inv.number || inv.id}`}
                  </div>
                  {inv.number && (
                    <div className="font-mono text-[10px] text-marron-soft">Nº {inv.number}</div>
                  )}
                </div>
                <span className="font-mono text-[13px] text-tinta">{fmtEUR(inv.total, inv.currency)}</span>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 border ${
                    inv.paid
                      ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]'
                      : 'bg-[#FCF0F0] text-granate border-[#D4878A]'
                  }`}
                >
                  {STATUS_LABEL[inv.status] || (inv.paid ? 'PAGADA' : 'PENDIENTE')}
                </span>
                <button
                  disabled={downloadingId === inv.id}
                  onClick={() => downloadInvoicePdf(inv)}
                  className="font-mono text-[10px] text-marino hover:text-granate transition-colors disabled:opacity-50"
                  title={inv.invoice_pdf ? 'Abrir PDF oficial de Stripe' : 'Generar PDF de la factura'}
                >
                  {downloadingId === inv.id ? 'GENERANDO…' : '↓ PDF'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 font-mono text-[11px] text-marron-soft">
        Facturación a nombre de {invoices[0]?.customer_name || 'tu centro'} · RGPD compliant · Datos en servidor europeo
      </div>
    </div>
  );
}
