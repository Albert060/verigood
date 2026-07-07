import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { authApi, orgApi } from '../../services/api';
import { PageHeader, SectionLabel, StatCard, ProgressBar, EmptyState } from '../../components/ui';

// /dashboard/stats — consume todos los agregados de GET /organizations/:id/stats
// (extendido en organizationsController). Sin datos simulados: si el centro
// aún no ha generado nada este mes, se muestra EmptyState.

const monthLabel = () => {
  const d = new Date();
  return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
};

// Resuelve nombre corto para el StatCard "Profesor más activo".
const shortenName = (full) => {
  if (!full) return '—';
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
};

export default function InstitutionalStats() {
  const { user } = useAuthStore();

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then((r) => r.data),
    staleTime: 60_000,
  });
  const orgId = me?.orgId || user?.orgId || user?.organization_id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: () => orgApi.getStats(orgId).then((r) => r.data),
    enabled: !!orgId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const monthly       = stats?.monthly       || { current_month: 0, previous_month: 0, delta_pct: null, hours_saved: 0 };
  const weeklyUsage   = stats?.weeklyUsage   || [];
  const breakdown     = stats?.moduleBreakdown || [];
  const teacherStats  = stats?.teacherStats  || [];
  const topTeacher    = stats?.topTeacher    || null;
  const topModule     = stats?.topModule     || null;

  // Normaliza el array de semanas a 4-5 cubos consecutivos (rellenando con 0
  // las semanas en las que no hubo actividad). Sin esto, una semana sin
  // generación desaparece y el chart muestra menos barras de las esperadas.
  const weekly = useMemo(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const weeksThisMonth = Math.min(5, Math.ceil(daysInMonth / 7));
    const map = new Map(weeklyUsage.map((w) => [Number(w.week), Number(w.count)]));
    return Array.from({ length: weeksThisMonth }, (_, i) => ({
      label: `Sem ${i + 1}`,
      value: map.get(i + 1) || 0,
    }));
  }, [weeklyUsage]);

  const weeklyMax    = Math.max(1, ...weekly.map((w) => w.value));
  const breakdownMax = Math.max(1, ...breakdown.map((b) => b.count));

  const hasAnyActivity = monthly.current_month > 0 || teacherStats.length > 0;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Estadísticas"
        subtitle={`USO DE LA PLATAFORMA · ${monthLabel()}`}
        romanNum="§ V"
      />

      {isLoading && (
        <div className="font-mono text-[12px] text-marron-soft py-8 text-center">
          Cargando estadísticas…
        </div>
      )}

      {!isLoading && !hasAnyActivity && (
        <EmptyState
          title="Aún no hay actividad este mes"
          description="Cuando los profesores empiecen a generar recursos verás aquí las métricas: generaciones, horas ahorradas, uso por módulo y desglose por profesor."
        />
      )}

      {!isLoading && hasAnyActivity && (
        <>
          {/* Top stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="GENERACIONES TOTALES"
              value={monthly.current_month}
              delta={
                monthly.delta_pct === null
                  ? null
                  : `${Math.abs(monthly.delta_pct)}% vs mes anterior`
              }
              deltaUp={monthly.delta_pct !== null && monthly.delta_pct >= 0}
            />
            <StatCard label="HORAS AHORRADAS (EST.)" value={`${monthly.hours_saved} h`} />
            <StatCard
              label="PROF. MÁS ACTIVO"
              value={shortenName(topTeacher?.name) || '—'}
              mono={false}
            />
            {/* MÓDULO + USADO — value puede ser largo (p.ej. "Conocimiento del
                medio"). StatCard ya lleva truncate vía className, pero aquí
                bajamos la tipografía con la prop dedicada del componente. */}
            <StatCard
              label="MÓDULO + USADO"
              value={topModule?.label || '—'}
              mono={false}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* Weekly chart */}
            <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
              <SectionLabel className="mb-3">
                USO SEMANAL — {new Date().toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()}
              </SectionLabel>
              <div className="flex items-end gap-3 h-20">
                {weekly.map((w) => (
                  <div key={w.label} className="flex flex-col items-center gap-1 flex-1">
                    <span className="font-mono text-[9px] text-tinta">{w.value}</span>
                    <div
                      className="w-full bg-marino opacity-70"
                      style={{ height: `${(w.value / weeklyMax) * 48}px`, minHeight: w.value > 0 ? '2px' : '0' }}
                    />
                    <span className="font-mono text-[9px] text-marron-soft">{w.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Module breakdown */}
            <div className="lg:col-span-2 bg-card-bg border border-linea shadow-card card-fold p-4">
              <SectionLabel className="mb-3">USO POR MÓDULO</SectionLabel>
              {breakdown.length === 0 ? (
                <p className="font-mono text-[11px] text-marron-soft py-2">Sin uso registrado este mes.</p>
              ) : (
                <div className="space-y-3">
                  {breakdown.map((m) => (
                    <div key={m.module_id} className="flex items-center gap-3">
                      <span
                        className="font-mono text-[11px] text-marron-soft w-32 flex-shrink-0 truncate"
                        title={m.label}
                      >
                        {m.label}
                      </span>
                      <ProgressBar value={m.count} max={breakdownMax} className="flex-1" />
                      <span className="font-mono text-[11px] text-tinta w-16 text-right">{m.count} usos</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Teachers */}
          <div className="bg-card-bg border border-linea shadow-card">
            <div className="px-4 py-3 border-b border-linea">
              <SectionLabel className="mb-0">ACTIVIDAD POR PROFESOR</SectionLabel>
            </div>
            {teacherStats.length === 0 ? (
              <p className="px-4 py-6 font-mono text-[11px] text-marron-soft text-center">
                Sin actividad por profesor este mes.
              </p>
            ) : (
              <div className="overflow-x-auto">
              <table className="vg-table">
                <thead>
                  <tr>
                    <th>PROFESOR</th>
                    <th>EXÁMENES</th>
                    <th>CORRECCIONES</th>
                    <th>DINÁMICAS</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherStats.map((t) => (
                    <tr key={t.id}>
                      <td className="font-medium text-tinta">{t.name}</td>
                      <td className="font-mono text-[12px]">{t.exams}</td>
                      <td className="font-mono text-[12px]">{t.corrections}</td>
                      <td className="font-mono text-[12px]">{t.dynamics}</td>
                      <td className="font-mono text-[13px] font-bold text-tinta">{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
