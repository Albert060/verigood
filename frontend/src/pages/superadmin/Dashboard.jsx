import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { superadminApi } from '../../services/api';
import { StatCard, PageHeader, Badge, ProgressBar, SectionLabel } from '../../components/ui';

const PLAN_PRICES = { starter: 29, colegio: 149, enterprise: 0 };
const PLAN_LABEL  = { starter: 'Starter', colegio: 'Colegio', enterprise: 'Enterprise' };
const PLAN_COLOR  = { starter: 'bg-linea', colegio: 'bg-marino', enterprise: 'bg-granate' };

const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function bucketLabel(bucket) {
  // 'YYYY-MM' → 'Abr 26', 'YYYY' → 'YYYY'
  if (!bucket) return '';
  if (bucket.length === 4) return bucket;
  const [y, m] = bucket.split('-');
  return `${MONTH_LABELS_ES[Number(m) - 1]} ${y.slice(2)}`;
}

function BarChart({ data, valueKey = 'count' }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d) => {
        const v = Number(d[valueKey]) || 0;
        return (
          <div key={d.bucket} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="font-mono text-[9px] text-marron-soft">{v}</span>
            <div
              className="w-full bg-marino opacity-70 min-h-[2px] transition-all duration-500"
              style={{ height: `${(v / max) * 60}px` }}
              title={`${bucketLabel(d.bucket)}: ${v}`}
            />
            <span className="font-mono text-[8px] text-marron-soft truncate w-full text-center">
              {bucketLabel(d.bucket)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SuperadminDashboard() {
  const [period, setPeriod] = useState('monthly'); // 'monthly' | 'yearly'

  const { data: stats } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: () => superadminApi.getStats().then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: orgsData, isLoading: loadingOrgs } = useQuery({
    queryKey: ['superadmin-recent-orgs'],
    queryFn: () => superadminApi.getOrgs({ limit: 5 }).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const recentOrgs = orgsData?.organizations || [];

  const mrr = useMemo(() => {
    const breakdown = stats?.planBreakdown || [];
    return breakdown.reduce((sum, row) => sum + (PLAN_PRICES[row.plan] || 0) * Number(row.count || 0), 0);
  }, [stats]);

  const planBreakdown = stats?.planBreakdown || [];
  const series = period === 'monthly' ? (stats?.monthlySeries || []) : (stats?.yearlySeries || []);
  const topModules = stats?.topModules || [];
  const topOrgs = stats?.topOrganizations || [];

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

      {/* Serie temporal + plan breakdown */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="col-span-2 bg-card-bg border border-linea shadow-card card-fold p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel className="mb-0">
              LLAMADAS API — {period === 'monthly' ? 'ÚLTIMOS 12 MESES' : 'ÚLTIMOS 3 AÑOS'}
            </SectionLabel>
            <div className="flex items-center gap-1">
              {[
                { key: 'monthly', label: 'MES' },
                { key: 'yearly',  label: 'AÑO' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                    period === opt.key
                      ? 'border-marino bg-marino text-papel'
                      : 'border-linea text-marron-soft hover:text-tinta'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {series.length === 0 ? (
            <p className="font-mono text-[11px] text-marron-soft">Sin actividad registrada.</p>
          ) : (
            <BarChart data={series} valueKey="count" />
          )}
        </div>

        {/* Plan breakdown */}
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

      {/* Top módulos + Top organizaciones del mes */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">TOP MÓDULOS — MES EN CURSO</SectionLabel>
          {topModules.length === 0 ? (
            <p className="font-mono text-[11px] text-marron-soft">Sin uso este mes.</p>
          ) : (
            <div className="space-y-2">
              {topModules.map((m) => {
                const max = Number(topModules[0]?.count) || 1;
                return (
                  <div key={m.module_id} className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-tinta flex-1 truncate" title={m.label}>
                      {m.label}
                    </span>
                    <ProgressBar value={Number(m.count)} max={max} className="w-24" />
                    <span className="font-mono text-[11px] text-marron-soft w-10 text-right">{m.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">TOP ORGANIZACIONES — MES EN CURSO</SectionLabel>
          {topOrgs.length === 0 ? (
            <p className="font-mono text-[11px] text-marron-soft">Sin actividad este mes.</p>
          ) : (
            <div className="space-y-2">
              {topOrgs.map((o) => {
                const max = Number(topOrgs[0]?.count) || 1;
                return (
                  <div key={o.id} className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-tinta flex-1 truncate" title={o.name}>
                      {o.name}
                    </span>
                    <Badge variant={`plan-${o.plan || 'starter'}`}>{(o.plan || 'starter').toUpperCase()}</Badge>
                    <span className="font-mono text-[11px] text-marron-soft w-10 text-right">{o.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Organizaciones recientes */}
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
