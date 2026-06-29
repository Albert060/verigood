import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { superadminApi, orgApi } from '../../services/api';
import { PageHeader, StatCard, SectionLabel, Badge, ProgressBar } from '../../components/ui';

const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function bucketLabel(bucket) {
  if (!bucket) return '';
  if (bucket.length === 4) return bucket;
  const [y, m] = bucket.split('-');
  return `${MONTH_LABELS_ES[Number(m) - 1]} ${y.slice(2)}`;
}

// Mini bar chart reutilizable — mismo lenguaje visual que el resto del panel.
function BarChart({ data, valueKey = 'count', height = 80 }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d) => {
        const v = Number(d[valueKey]) || 0;
        return (
          <div key={d.bucket || d.label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="font-mono text-[9px] text-marron-soft">{v}</span>
            <div
              className="w-full bg-marino opacity-70 min-h-[2px] transition-all duration-500"
              style={{ height: `${(v / max) * (height - 24)}px` }}
              title={`${d.bucket || d.label}: ${v}`}
            />
            <span className="font-mono text-[8px] text-marron-soft truncate w-full text-center">
              {d.bucket ? bucketLabel(d.bucket) : d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SuperadminStats() {
  const [period, setPeriod] = useState('monthly');
  const [orgId, setOrgId] = useState('');

  // Stats globales del superadmin (ya devolvía monthlySeries, yearlySeries,
  // topModules, topOrganizations; ampliado ahora con topTools).
  const { data: stats, isLoading } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: () => superadminApi.getStats().then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Lista de orgs para el selector — reutiliza el endpoint global existente.
  const { data: orgsData } = useQuery({
    queryKey: ['superadmin-orgs', 'stats-selector'],
    queryFn: () => superadminApi.getOrgs({ limit: 200 }).then((r) => r.data),
    staleTime: 60_000,
  });
  const orgs = orgsData?.organizations || [];

  // Stats detallados de la org seleccionada — reutiliza el mismo endpoint que
  // ven los admins de centro. El controller permite superadmin (allowlist en
  // organizationsController.getStats).
  const { data: orgStats, isLoading: loadingOrgStats } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: () => orgApi.getStats(orgId).then((r) => r.data),
    enabled: !!orgId,
    staleTime: 30_000,
  });

  const series = period === 'monthly' ? (stats?.monthlySeries || []) : (stats?.yearlySeries || []);
  const topModules = stats?.topModules || [];
  const topOrgs    = stats?.topOrganizations || [];
  const topTools   = stats?.topTools || [];
  const topTool    = topTools[0] || null;
  const monthly    = stats?.monthly || { current_month: 0, previous_month: 0, delta_pct: null, hours_saved: 0 };
  const topTeachers = stats?.topTeachers || [];
  const averages   = stats?.averages || {};
  const lifetime   = stats?.lifetime || { total_calls: 0, yearly_calls: 0, hours_saved: 0 };

  // Si el mes en curso está vacío pero hay actividad histórica, mostramos el
  // total acumulado como referencia para que la página no parezca "rota".
  const showLifetime = monthly.current_month === 0 && lifetime.total_calls > 0;

  // Uso semanal global del mes en curso (mismo cálculo que /dashboard/stats
  // pero agregado de todos los centros).
  const globalWeekly = useMemo(() => {
    const list = stats?.weeklyUsage || [];
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const weeks = Math.min(5, Math.ceil(daysInMonth / 7));
    const map = new Map(list.map((w) => [Number(w.week), Number(w.count)]));
    return Array.from({ length: weeks }, (_, i) => ({
      label: `Sem ${i + 1}`,
      value: map.get(i + 1) || 0,
    }));
  }, [stats]);
  const globalWeeklyMax = Math.max(1, ...globalWeekly.map((w) => w.value));

  // Para el detalle por colegio: reusamos la misma lógica que /dashboard/stats.
  const orgBreakdown = orgStats?.moduleBreakdown || [];
  const orgTeachers  = orgStats?.teacherStats   || [];
  const orgWeekly    = useMemo(() => {
    const list = orgStats?.weeklyUsage || [];
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const weeks = Math.min(5, Math.ceil(daysInMonth / 7));
    const map = new Map(list.map((w) => [Number(w.week), Number(w.count)]));
    return Array.from({ length: weeks }, (_, i) => ({
      label: `Sem ${i + 1}`,
      value: map.get(i + 1) || 0,
    }));
  }, [orgStats]);
  const orgBreakdownMax = Math.max(1, ...orgBreakdown.map((b) => Number(b.count)));
  const orgWeeklyMax    = Math.max(1, ...orgWeekly.map((w) => w.value));

  const selectedOrg = orgs.find((o) => o.id === orgId);

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Estadísticas globales"
        subtitle="USO DE LA PLATAFORMA · TODOS LOS CENTROS"
        romanNum="§ VI"
      />

      {/* KPIs — mismos campos que ve el admin del centro pero en agregado global */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <StatCard
          label={showLifetime ? 'GENERACIONES TOTAL' : 'GENERACIONES MES'}
          value={isLoading ? '—'
            : showLifetime
              ? (lifetime.total_calls ?? 0).toLocaleString('es-ES')
              : (monthly.current_month ?? 0).toLocaleString('es-ES')}
          delta={showLifetime
            ? 'sin actividad este mes · total histórico'
            : (monthly.delta_pct != null
                ? `${monthly.delta_pct > 0 ? '+' : ''}${monthly.delta_pct}% vs mes ant.`
                : null)}
          deltaUp={!showLifetime && monthly.delta_pct >= 0}
        />
        <StatCard
          label={showLifetime ? 'HORAS AHORRADAS TOTAL' : 'HORAS AHORRADAS MES'}
          value={`${showLifetime ? lifetime.hours_saved : (monthly.hours_saved ?? 0)} h`}
          mono={false}
        />
        <StatCard
          label="ORGS ACTIVAS"
          value={isLoading ? '—' : `${stats?.organizations?.active ?? 0} / ${stats?.organizations?.total ?? 0}`}
        />
        <StatCard
          label="PROFESORES ACTIVOS"
          value={isLoading ? '—' : (stats?.users?.total ?? 0).toLocaleString('es-ES')}
        />
      </div>

      {/* Promedios por colegio — agregado del rendimiento real de la cartera */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <StatCard
          label="MEDIA GENERACIONES / COLEGIO · MES"
          value={isLoading ? '—' : (averages.calls_per_org_month ?? 0).toLocaleString('es-ES')}
          delta={averages.orgs_with_activity_month != null
            ? `${averages.orgs_with_activity_month} centros activos este mes`
            : null}
          mono={false}
        />
        <StatCard
          label="MEDIA GENERACIONES / COLEGIO · AÑO"
          value={isLoading ? '—' : (averages.calls_per_org_year ?? 0).toLocaleString('es-ES')}
          delta={averages.orgs_with_activity_year != null
            ? `${averages.orgs_with_activity_year} centros activos este año`
            : null}
          mono={false}
        />
        <StatCard
          label="MEDIA HISTÓRICA / COLEGIO"
          value={isLoading ? '—' : (averages.calls_per_org_lifetime ?? 0).toLocaleString('es-ES')}
          delta={averages.orgs_with_activity_lifetime != null
            ? `sobre ${averages.orgs_with_activity_lifetime} centros con uso`
            : null}
          mono={false}
        />
        <StatCard
          label="MEDIA PROFESORES / COLEGIO"
          value={isLoading ? '—' : (averages.teachers_per_org ?? 0).toLocaleString('es-ES')}
          mono={false}
        />
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard
          label="LLAMADAS / MES"
          value={isLoading ? '—' : Number(stats?.usage?.monthly_calls ?? 0).toLocaleString('es-ES')}
        />
        <StatCard
          label="HERRAMIENTA TOP"
          value={topTool?.label || '—'}
          delta={topTool ? `${topTool.count} usos · ${topTool.module_label || ''}` : null}
          mono={false}
        />
        <StatCard
          label="MÓDULO TOP"
          value={topModules[0]?.label || '—'}
          delta={topModules[0] ? `${topModules[0].count} usos` : null}
          mono={false}
        />
        <StatCard
          label="COLEGIO TOP"
          value={topOrgs[0]?.name || '—'}
          delta={topOrgs[0] ? `${topOrgs[0].count} generaciones` : null}
          mono={false}
        />
      </div>

      {/* Serie temporal */}
      <div className="bg-card-bg border border-linea shadow-card card-fold p-4 mb-5">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <SectionLabel className="mb-0">
            ACTIVIDAD GLOBAL — {period === 'monthly' ? 'ÚLTIMOS 12 MESES' : 'ÚLTIMOS 3 AÑOS'}
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
          <BarChart data={series} valueKey="count" height={96} />
        )}
      </div>

      {/* Uso semanal global + Top profesores globales */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">USO SEMANAL GLOBAL — MES EN CURSO</SectionLabel>
          {globalWeekly.every((w) => w.value === 0) ? (
            <p className="font-mono text-[11px] text-marron-soft">Sin actividad este mes.</p>
          ) : (
            <div className="flex items-end gap-3 h-24">
              {globalWeekly.map((w) => (
                <div key={w.label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="font-mono text-[9px] text-tinta">{w.value}</span>
                  <div
                    className="w-full bg-marino opacity-70 min-h-[2px]"
                    style={{ height: `${(w.value / globalWeeklyMax) * 64}px` }}
                  />
                  <span className="font-mono text-[9px] text-marron-soft">{w.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">PROFESORES TOP — TODOS LOS CENTROS</SectionLabel>
          {topTeachers.length === 0 ? (
            <p className="font-mono text-[11px] text-marron-soft">Sin actividad este mes.</p>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {topTeachers.map((t) => {
                const max = Number(topTeachers[0]?.total) || 1;
                return (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-tinta truncate" title={t.name}>{t.name}</div>
                      <div className="font-mono text-[9px] text-marron-soft truncate">
                        {t.organization_name || '—'}
                      </div>
                    </div>
                    <ProgressBar value={Number(t.total)} max={max} className="w-24" />
                    <span className="font-mono text-[11px] text-marron-soft w-10 text-right">{t.total}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top herramientas + Top módulos */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">TOP HERRAMIENTAS — MES EN CURSO</SectionLabel>
          {topTools.length === 0 ? (
            <p className="font-mono text-[11px] text-marron-soft">Sin uso este mes.</p>
          ) : (
            <div className="space-y-2">
              {topTools.map((t) => {
                const max = Number(topTools[0]?.count) || 1;
                return (
                  <div key={t.tool_key} className="flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-tinta truncate" title={t.label}>{t.label}</div>
                      <div className="font-mono text-[9px] text-marron-soft truncate">
                        {t.module_label || t.module_id || ''}
                      </div>
                    </div>
                    <ProgressBar value={Number(t.count)} max={max} className="w-24" />
                    <span className="font-mono text-[11px] text-marron-soft w-10 text-right">{t.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
      </div>

      {/* Top organizaciones global */}
      <div className="bg-card-bg border border-linea shadow-card mb-5">
        <div className="flex items-center justify-between px-4 py-3 border-b border-linea">
          <SectionLabel className="mb-0">TOP COLEGIOS — MES EN CURSO</SectionLabel>
        </div>
        {topOrgs.length === 0 ? (
          <div className="px-4 py-6 text-center font-mono text-[11px] text-marron-soft">
            Sin actividad este mes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="vg-table">
              <thead>
                <tr><th>CENTRO</th><th>PLAN</th><th>USO MES</th><th></th></tr>
              </thead>
              <tbody>
                {topOrgs.map((o) => {
                  const max = Number(topOrgs[0]?.count) || 1;
                  return (
                    <tr key={o.id}>
                      <td className="font-medium text-tinta">{o.name}</td>
                      <td><Badge variant={`plan-${o.plan || 'starter'}`}>{(o.plan || 'starter').toUpperCase()}</Badge></td>
                      <td className="font-mono text-[12px]">{o.count}</td>
                      <td><ProgressBar value={Number(o.count)} max={max} className="w-40" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detalle por colegio */}
      <div className="bg-card-bg border border-linea shadow-card mb-6">
        <div className="px-4 py-3 border-b border-linea flex items-center gap-3 flex-wrap">
          <SectionLabel className="mb-0">DETALLE POR COLEGIO</SectionLabel>
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
          >
            <option value="">Selecciona un centro…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          {selectedOrg && (
            <span className="font-mono text-[10px] text-marron-soft ml-auto">
              {selectedOrg.city || '—'} · Plan {(selectedOrg.plan || 'starter').toUpperCase()}
            </span>
          )}
        </div>

        {!orgId && (
          <div className="px-4 py-8 text-center font-mono text-[11px] text-marron-soft">
            Elige un colegio del desplegable para ver su uso semanal, módulos y profesores.
          </div>
        )}

        {orgId && loadingOrgStats && (
          <div className="h-32 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-marino border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {orgId && !loadingOrgStats && orgStats && (
          <div className="p-4 space-y-5">
            {/* KPIs del centro */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                label="GENERACIONES MES"
                value={(orgStats.monthly?.current_month ?? 0).toLocaleString('es-ES')}
                delta={orgStats.monthly?.delta_pct != null
                  ? `${orgStats.monthly.delta_pct > 0 ? '+' : ''}${orgStats.monthly.delta_pct}% vs mes ant.`
                  : null}
                deltaUp={orgStats.monthly?.delta_pct >= 0}
              />
              <StatCard
                label="HORAS AHORRADAS"
                value={`${orgStats.monthly?.hours_saved ?? 0} h`}
                mono={false}
              />
              <StatCard
                label="PROFESOR TOP"
                value={orgStats.topTeacher?.name || '—'}
                delta={orgStats.topTeacher ? `${orgStats.topTeacher.total} generaciones` : null}
                mono={false}
              />
              <StatCard
                label="MÓDULO TOP"
                value={orgStats.topModule?.label || '—'}
                delta={orgStats.topModule ? `${orgStats.topModule.count} usos` : null}
                mono={false}
              />
            </div>

            {/* Uso semanal + breakdown por módulo */}
            <div className="grid grid-cols-2 gap-5">
              <div className="border border-linea p-4">
                <SectionLabel className="mb-3">USO SEMANAL — MES EN CURSO</SectionLabel>
                {orgWeekly.every((w) => w.value === 0) ? (
                  <p className="font-mono text-[11px] text-marron-soft">Sin actividad este mes.</p>
                ) : (
                  <div className="flex items-end gap-3 h-24">
                    {orgWeekly.map((w) => (
                      <div key={w.label} className="flex flex-col items-center gap-1 flex-1">
                        <span className="font-mono text-[9px] text-tinta">{w.value}</span>
                        <div
                          className="w-full bg-marino opacity-70 min-h-[2px]"
                          style={{ height: `${(w.value / orgWeeklyMax) * 64}px` }}
                        />
                        <span className="font-mono text-[9px] text-marron-soft">{w.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-linea p-4">
                <SectionLabel className="mb-3">USO POR MÓDULO</SectionLabel>
                {orgBreakdown.length === 0 ? (
                  <p className="font-mono text-[11px] text-marron-soft">Sin uso este mes.</p>
                ) : (
                  <div className="space-y-2">
                    {orgBreakdown.map((b) => (
                      <div key={b.module_id} className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] text-tinta flex-1 truncate" title={b.label}>{b.label}</span>
                        <ProgressBar value={Number(b.count)} max={orgBreakdownMax} className="w-24" />
                        <span className="font-mono text-[11px] text-marron-soft w-10 text-right">{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Desglose por profesor */}
            <div className="border border-linea">
              <div className="px-4 py-3 border-b border-linea">
                <SectionLabel className="mb-0">PROFESORES — MES EN CURSO</SectionLabel>
              </div>
              {orgTeachers.length === 0 ? (
                <div className="px-4 py-6 text-center font-mono text-[11px] text-marron-soft">
                  Sin actividad de profesores este mes.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="vg-table">
                    <thead>
                      <tr>
                        <th>PROFESOR</th><th>EXÁMENES</th><th>CORRECCIONES</th><th>DINÁMICAS</th><th>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgTeachers.map((t) => (
                        <tr key={t.id}>
                          <td className="text-tinta font-medium">{t.name}</td>
                          <td className="font-mono text-[12px]">{t.exams}</td>
                          <td className="font-mono text-[12px]">{t.corrections}</td>
                          <td className="font-mono text-[12px]">{t.dynamics}</td>
                          <td className="font-mono text-[12px] font-bold">{t.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
