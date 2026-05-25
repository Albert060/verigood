import { useQuery } from '@tanstack/react-query';
import { superadminApi } from '../../services/api';
import { StatCard, PageHeader, Badge, ProgressBar, SectionLabel } from '../../components/ui';

const PLAN_PRICES = { starter: 29, colegio: 149, enterprise: 490 };

// Mini bar chart
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
          <span className="font-mono text-[9px] text-marron-soft">{d.value}</span>
          <div
            className="w-full bg-marino opacity-70 min-h-[2px] transition-all duration-500"
            style={{ height: `${(d.value / max) * 48}px` }}
          />
          <span className="font-mono text-[8px] text-marron-soft">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const MOCK_WEEKLY = [
  { label: 'Lun', value: 1840 }, { label: 'Mar', value: 2210 }, { label: 'Mié', value: 1950 },
  { label: 'Jue', value: 2680 }, { label: 'Vie', value: 3100 }, { label: 'Sáb', value: 890 }, { label: 'Dom', value: 430 },
];

const MOCK_ORGS = [
  { id: 1, name: 'Colegio San Isidro', city: 'Madrid', plan: 'colegio', users: 12, usage: 2840, is_active: true },
  { id: 2, name: 'IES Cervantes', city: 'Barcelona', plan: 'starter', users: 1, usage: 320, is_active: true },
  { id: 3, name: 'Colegio Santa María', city: 'Valencia', plan: 'enterprise', users: 38, usage: 9100, is_active: true },
  { id: 4, name: 'CEIP Los Olivos', city: 'Sevilla', plan: 'colegio', users: 7, usage: 1240, is_active: true },
  { id: 5, name: 'IES Lope de Vega', city: 'Málaga', plan: 'starter', users: 1, usage: 80, is_active: false },
];

export default function SuperadminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: () => superadminApi.getStats().then((r) => r.data),
  });

  const mrr = MOCK_ORGS.filter((o) => o.is_active)
    .reduce((sum, o) => sum + (PLAN_PRICES[o.plan] || 0), 0);

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Panel Global"
        subtitle="SUPERADMIN · VeriGood"
        romanNum="§ I"
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="ORGANIZACIONES" value={stats?.organizations?.total ?? 24} delta="+2 este mes" deltaUp />
        <StatCard label="PROFESORES ACTIVOS" value={stats?.users?.total ?? 312} delta="+18 esta semana" deltaUp />
        <StatCard label="MRR" value={`${mrr.toLocaleString('es')} €`} delta="+340 € vs mes anterior" deltaUp mono={false} />
        <StatCard label="LLAMADAS API / MES" value={stats?.usage?.monthly_calls ?? '24.8k'} />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Weekly usage chart */}
        <div className="col-span-2 bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">LLAMADAS API — ÚLTIMOS 7 DÍAS</SectionLabel>
          <BarChart data={MOCK_WEEKLY} />
        </div>

        {/* Plan breakdown */}
        <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">DISTRIBUCIÓN POR PLAN</SectionLabel>
          <div className="space-y-3">
            {[
              { plan: 'Enterprise', count: 4, color: 'bg-granate' },
              { plan: 'Colegio', count: 16, color: 'bg-marino' },
              { plan: 'Starter', count: 4, color: 'bg-linea' },
            ].map(({ plan, count, color }) => (
              <div key={plan} className="flex items-center gap-2.5">
                <div className={`w-2 h-2 ${color} flex-shrink-0`} />
                <span className="font-mono text-[11px] text-tinta flex-1">{plan}</span>
                <span className="font-mono text-[12px] font-bold text-tinta">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Organizations table */}
      <div className="bg-card-bg border border-linea shadow-card mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-linea">
          <SectionLabel className="mb-0 text-[11px]">ORGANIZACIONES RECIENTES</SectionLabel>
          <a href="/superadmin/organizations" className="font-mono text-[10px] text-marino hover:text-granate transition-colors">
            Ver todas →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="vg-table">
            <thead>
              <tr>
                <th>CENTRO</th><th>CIUDAD</th><th>PLAN</th><th>PROFESORES</th>
                <th>USO MES</th><th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ORGS.map((org) => (
                <tr key={org.id}>
                  <td className="font-medium text-tinta">{org.name}</td>
                  <td className="text-marron-soft font-mono text-[11px]">{org.city}</td>
                  <td><Badge variant={`plan-${org.plan}`}>{org.plan.toUpperCase()}</Badge></td>
                  <td className="font-mono text-[12px]">{org.users}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={org.usage} max={10000} className="w-16" />
                      <span className="font-mono text-[10px] text-marron-soft">{org.usage.toLocaleString()}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant={org.is_active ? 'active' : 'paused'}>
                      {org.is_active ? 'ACTIVO' : 'SUSPENDIDO'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
