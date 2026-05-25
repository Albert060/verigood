import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { stripeApi } from '../../services/api';
import { PageHeader, Button, SectionLabel } from '../../components/ui';

const INVOICES = [
  { date: '2026-04-01', desc: 'VeriGood Colegio — Abril 2026', amount: '149,00 €', status: 'Pagado' },
  { date: '2026-03-01', desc: 'VeriGood Colegio — Marzo 2026', amount: '149,00 €', status: 'Pagado' },
  { date: '2026-02-01', desc: 'VeriGood Colegio — Febrero 2026', amount: '149,00 €', status: 'Pagado' },
  { date: '2026-01-01', desc: 'VeriGood Colegio — Enero 2026', amount: '149,00 €', status: 'Pagado' },
];

export default function InstitutionalBilling() {
  const [loadingPortal, setLoadingPortal] = useState(false);

  const openPortal = async () => {
    setLoadingPortal(true);
    try {
      const { data } = await stripeApi.portal();
      window.location.href = data.url;
    } catch {
      setLoadingPortal(false);
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
            <div className="font-mono text-[13px] text-tinta">1 mayo 2026</div>
            <div className="font-mono text-[10px] text-marron-soft mt-3 mb-1">MÉTODO DE PAGO</div>
            <div className="font-mono text-[12px] text-tinta">Visa •••• 4242</div>
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
            <Button loading={loadingPortal} onClick={openPortal}>
              Gestionar suscripción
            </Button>
            <p className="font-mono text-[10px] text-marron-soft text-right">Cambia plan, actualiza pago o cancela</p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-card-bg border border-linea shadow-card">
        <div className="px-4 py-3 border-b border-linea">
          <SectionLabel className="mb-0">HISTORIAL DE FACTURAS</SectionLabel>
        </div>
        <div className="divide-y divide-[rgba(184,169,136,0.3)]">
          {INVOICES.map((inv, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <span className="font-mono text-[11px] text-marron-soft w-24 flex-shrink-0">
                {new Date(inv.date).toLocaleDateString('es')}
              </span>
              <span className="flex-1 text-[13px] text-tinta">{inv.desc}</span>
              <span className="font-mono text-[13px] text-tinta">{inv.amount}</span>
              <span className="font-mono text-[10px] px-2 py-0.5 bg-[#EBF5EF] text-[#1A5C35] border border-[#7DC49B]">
                {inv.status.toUpperCase()}
              </span>
              <button className="font-mono text-[10px] text-marino hover:text-granate transition-colors">
                PDF
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 font-mono text-[11px] text-marron-soft">
        Facturación a nombre de Colegio San Isidro · CIF B12345678 · Madrid · RGPD compliant · Datos en servidor europeo
      </div>
    </div>
  );
}
