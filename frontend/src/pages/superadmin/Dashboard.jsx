import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { superadminApi } from '../../services/api';
import { StatCard, PageHeader, Badge, ProgressBar, SectionLabel } from '../../components/ui';

const PLAN_PRICES = { starter: 29, colegio: 149, enterprise: 490 };
const PLAN_LABEL  = { starter: 'Starter', colegio: 'Colegio', enterprise: 'Enterprise' };
const PLAN_COLOR  = { starter: 'bg-linea', colegio: 'bg-marino', enterprise: 'bg-granate' };

// Mini bar chart
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
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

// Serie semanal placeholder — el endpoint /superadmin/stats no devuelve aún
// serie temporal. Se reemplazará cuando el controller la añada.
const WEEKLY_PLACEHOLDER = [
  { label: 'Lun', value: 0 }, { label: 'Mar', value: 0 }, { label: 'Mié', value: 0 },
  { label: 'Jue', value: 0 }, { label: 'Vie', value: 0 }, { label: 'Sáb', value: 0 }, { label: 'Dom', value: 0 },
];

export default function SuperadminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: () => superadminApi.getStats().then((r) => r.data),
  });

  // Top 5 organizaciones más recientes
  const { data: orgsData, isLoading: loadingOrgs } = useQuery({
    queryKey: ['superadmin-recent-orgs'],
    queryFn: () => superadminApi.getOrgs({ limit: 5 }).then((r) => r.data),
  });
  const recentOrgs = orgsData?.organizations || [];

  // MRR real desde el breakdown de planes que ya devuelve el backend
  const mrr = useMemo(() => {
    const breakdown = stats?.planBreakdown || [];
    return breakdown.reduce((sum, row) => sum + (PLAN_PRICES[row.plan] || 0) * Number(row.count || 0), 0);
  }, [stats]);

  const planBreakdown = stats?.planBreakdown || [];

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Panel Global"
        subtitle="SUPERADMIN · VeriGood"
        romanNum="§ I"
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="ORGANIZACIONES"
          value={stats?.organizations?.total ?? '—'}
          delta={stats?.organizations?.active != null ? `${stats.organizations.active} activas` : null}
          deltaUp
        />
        <StatCard
          label="PROFESORES ACTIVOS"
          value={stats?.users?.total ?? '—'}
        />
        <StatCard
          label="MRR"
          value={mrr ? `${mrr.toLocaleString('es-ES')} €` : '—'}
          mono={false}
        />
        <StatCard
          label="LLAMADAS API / MES"
          value={stats?.usage?.monthly_calls ?? '—'}
        />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Weekly usage chart — placeholder hasta que /superadmin/stats devuelva serie */}
        <div className="col-span-2 bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">LLAMADAS API — ÚLTIMOS 7 DÍAS</SectionLabel>
          <BarChart data={WEEKLY_PLACEHOLDER} />
          <p className="font-mono text-[10px] text-marron-soft mt-2">
            Serie temporal pendiente de exponer en el endpoint /superadmin/stats.
          </p>
        </div>

        {/* Plan breakdown — datos reales del endpoint */}
        <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">DISTRIBUCIÓN POR PLAN</SectionLabel>
          {planBreakdown.length === 0 ? (
            <p className="font-mono text-[11px] text-marron-soft">Sin datos.</p>
          ) : (
            <div className="space-y-3">
              {planBreakdown
                .slice()
                .sort((a, b) => Number(b.count) - Number(a.count))
                .map(({ plan, count }) => (
                  <div key={plan} className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 ${PLAN_COLOR[plan] || 'bg-linea'} flex-shrink-0`} />
                    <span className="font-mono text-[11px] text-tinta flex-1">{PLAN_LABEL[plan] || plan}</span>
                    <span className="font-mono text-[12px] font-bold text-tinta">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Organizations table — datos reales */}
      <div className="bg-card-bg border border-linea shadow-card mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-linea">
          <SectionLabel className="mb-0 text-[11px]">ORGANIZACIONES RECIENTES</SectionLabel>
          <a href="/superadmin/organizations" className="font-mono text-[10px] text-marino hover:text-granate transition-colors">
            Ver todas →
          </a>
        </div>

        {loadingOrgs && (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-marino border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingOrgs && recentOrgs.length === 0 && (
          <div className="px-4 py-6 text-center font-mono text-[11px] text-marron-soft">
            Aún no hay centros registrados.
          </div>
        )}

        {!loadingOrgs && recentOrgs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="vg-table">
              <thead>
                <tr>
                  <th>CENTRO</th><th>CIUDAD</th><th>PLAN</th><th>PROFESORES</th>
                  <th>USO MES</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {recentOrgs.map((org) => {
                  const usage = Number(org.monthly_usage ?? 0);
                  return (
                    <tr key={org.id}>
                      <td className="font-medium text-tinta">{org.name || '—'}</td>
                      <td className="text-marron-soft font-mono text-[11px]">{org.city || '—'}</td>
                      <td>
                        <Badge variant={`plan-${org.plan || 'starter'}`}>
                          {(org.plan || 'starter').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="font-mono text-[12px]">{org.active_users ?? 0}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={usage} max={10000} className="w-16" />
                          <span className="font-mono text-[10px] text-marron-soft">
                            {usage.toLocaleString('es-ES')}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={org.is_active ? 'active' : 'paused'}>
                          {org.is_active ? 'ACTIVO' : 'SUSPENDIDO'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
