import { PageHeader, StatCard, SectionLabel } from '../../components/ui';

const INVOICES = [
  { date: '2026-04-01', org: 'Colegio San Isidro', plan: 'Colegio', amount: '149,00 €', status: 'Pagado' },
  { date: '2026-04-01', org: 'Colegio Santa María', plan: 'Enterprise', amount: '490,00 €', status: 'Pagado' },
  { date: '2026-04-01', org: 'CEIP Los Olivos', plan: 'Colegio', amount: '149,00 €', status: 'Pagado' },
  { date: '2026-04-01', org: 'Colegio Bilingüe Norte', plan: 'Colegio', amount: '149,00 €', status: 'Pagado' },
  { date: '2026-04-01', org: 'IES Cervantes', plan: 'Starter', amount: '29,00 €', status: 'Pagado' },
  { date: '2026-04-01', org: 'IES Lope de Vega', plan: 'Starter', amount: '29,00 €', status: 'Fallido' },
];

const MONTHLY = [
  { label: 'Nov', value: 6200 }, { label: 'Dic', value: 6200 }, { label: 'Ene', value: 7350 },
  { label: 'Feb', value: 7840 }, { label: 'Mar', value: 8090 }, { label: 'Abr', value: 8420 },
];

export default function SuperadminBilling() {
  const max = Math.max(...MONTHLY.map((m) => m.value));
  return (
    <div className="animate-slide-in">
      <PageHeader title="Facturación global" subtitle="INGRESOS · STRIPE DASHBOARD" romanNum="§ III" />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="MRR ACTUAL" value="8.420 €" delta="+4,1% vs marzo" deltaUp />
        <StatCard label="ARR ESTIMADO" value="101.040 €" />
        <StatCard label="CHURN RATE" value="0,8 %" delta="−0,2 pp" deltaUp />
        <StatCard label="PAGO FALLIDO" value="1" delta="IES Lope de Vega" />
      </div>

      {/* MRR chart */}
      <div className="bg-card-bg border border-linea shadow-card card-fold p-5 mb-5">
        <SectionLabel className="mb-3">EVOLUCIÓN MRR — ÚLTIMOS 6 MESES</SectionLabel>
        <div className="flex items-end gap-3 h-24">
          {MONTHLY.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1 flex-1">
              <span className="font-mono text-[9px] text-tinta">{(m.value / 1000).toFixed(1)}k</span>
              <div
                className="w-full bg-marino opacity-70"
                style={{ height: `${(m.value / max) * 64}px` }}
              />
              <span className="font-mono text-[9px] text-marron-soft">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-card-bg border border-linea shadow-card">
        <div className="px-4 py-3 border-b border-linea">
          <SectionLabel className="mb-0">ÚLTIMAS TRANSACCIONES</SectionLabel>
        </div>
        <table className="vg-table">
          <thead>
            <tr><th>FECHA</th><th>ORGANIZACIÓN</th><th>PLAN</th><th>IMPORTE</th><th>ESTADO</th></tr>
          </thead>
          <tbody>
            {INVOICES.map((inv, i) => (
              <tr key={i}>
                <td className="font-mono text-[11px] text-marron-soft">{new Date(inv.date).toLocaleDateString('es')}</td>
                <td className="text-tinta font-medium">{inv.org}</td>
                <td className="font-mono text-[11px] text-marron-soft">{inv.plan}</td>
                <td className="font-mono text-[13px] text-tinta">{inv.amount}</td>
                <td>
                  <span className={`font-mono text-[10px] px-2 py-0.5 border ${
                    inv.status === 'Pagado'
                      ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]'
                      : 'bg-[#FCF0F0] text-granate border-[#D4878A]'
                  }`}>
                    {inv.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
