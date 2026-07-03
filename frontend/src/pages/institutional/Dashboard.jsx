import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { authApi, orgApi, modulesApi } from '../../services/api';
import { StatCard, PageHeader, SectionLabel, ProgressBar } from '../../components/ui';
import EmptyState from '../../components/ui/EmptyState';
import RecentActivityList from '../../components/ui/RecentActivityList';
import OnboardingHero from '../../components/onboarding/OnboardingHero';

export default function InstitutionalDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Resuelve orgId con prioridad al backend (/auth/me) por si el authStore
  // persistido en localStorage está desactualizado o no lo guardó al loguear.
  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then((r) => r.data),
    staleTime: 60_000,
  });
  const orgId = me?.orgId || user?.orgId || user?.organization_id;

  const { data: orgModulesData } = useQuery({
    queryKey: ['modules', 'org', orgId],
    queryFn: () => modulesApi.listOrgModules(orgId).then((r) => r.data),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', orgId],
    queryFn: () => orgApi.getOnboardingState(orgId).then((r) => r.data),
    enabled: !!orgId,
  });

  // Refresca cada 60s + al volver al foco. El QueryClient global tiene
  // staleTime de 2 min y refetchOnWindowFocus desactivado, lo que era el
  // motivo por el que el admin no veía las acciones nuevas del profesor sin
  // recargar manualmente. Aquí lo sobreescribimos para esta query concreta.
  const { data: stats } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: () => orgApi.getStats(orgId).then((r) => r.data),
    enabled: !!orgId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Al entrar al dashboard invalidamos la cache una vez para garantizar que
  // las acciones que el usuario haya hecho en otra pestaña/ventana se reflejen
  // sin esperar al siguiente refetchInterval ni depender del focus.
  useEffect(() => {
    if (orgId) {
      qc.invalidateQueries({ queryKey: ['org-stats', orgId] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const dismissOnboarding = useMutation({
    mutationFn: () => orgApi.completeOnboarding(orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding', orgId] }),
  });

  const activeModules = orgModulesData?.modules || [];
  const showHero = onboarding && !onboarding.completed;
  const recentActivity = stats?.recentActivity || [];
  const usageByModule = stats?.usageByModule || [];

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={`Hola, ${user?.name?.split(' ')[0] || 'Profesor'}`}
        subtitle={`${(user?.orgName || '').toUpperCase()} · ${(user?.plan || 'TRIAL').toUpperCase()}`}
        romanNum="§ I"
      />

      {showHero && (
        <OnboardingHero
          state={onboarding}
          orgName={user?.orgName}
          onDismiss={() => dismissOnboarding.mutate()}
        />
      )}

      {/* Stats — solo visibles para admin_centro / superadmin.
          El profesor no ve tarjetas de estadísticas: su dashboard se centra
          en los módulos y sus temarios (C1). */}
      {user?.role !== 'profesor' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard label="PROFESORES" value={stats?.users?.active_users ?? 0} />
          <StatCard label="MÓDULOS ACTIVOS" value={activeModules.length} />
          <StatCard label="ACCIONES IA (30D)" value={usageByModule.reduce((s, u) => s + Number(u.count || 0), 0)} />
          <StatCard label="ÚLTIMA ACTIVIDAD" value={recentActivity[0]?.created_at ? new Date(recentActivity[0].created_at).toLocaleDateString('es-ES') : '—'} />
        </div>
      )}

      {/* Module tiles */}
      <SectionLabel className="mb-5">MÓDULOS ACTIVOS</SectionLabel>
      {activeModules.length === 0 ? (
        <EmptyState
          glyph="◆"
          title="Aún no hay módulos activos"
          description="Activa los módulos de tu centro para empezar a usar las herramientas IA."
          cta={{ label: 'Ir a módulos', onClick: () => navigate('/dashboard/modules') }}
          className="mb-10"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-10">
          {activeModules.map((mod, idx) => (
            <button
              key={mod.id}
              onClick={() => navigate(mod.route_prefix)}
              className="bg-card-bg border border-linea shadow-card rounded-2xl p-5 md:p-8 min-h-[180px] md:min-h-[210px] text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
            >
              <div className="font-display italic text-[18px] md:text-[22px] mb-3 md:mb-5 text-marron-soft opacity-60">
                § {romanize(idx + 1)}
              </div>
              <div className="text-[22px] md:text-[26px] lg:text-[30px] font-semibold text-tinta mb-2 md:mb-3 leading-tight break-words">
                {mod.name}
              </div>
              <div className="font-mono text-[13px] md:text-[15px] text-marron-soft break-words">
                {mod.stage.toUpperCase()} · {mod.category === 'preparacion_examen' ? 'PREP. EXAMEN' : 'ASIGNATURA'}
              </div>
              <div className="mt-auto pt-4 md:pt-5 h-1 w-14 md:w-16 rounded-full bg-marino opacity-40" />
            </button>
          ))}
        </div>
      )}

      {/* Usage + Activity — sólo admin_centro / superadmin. El profesor no
          los ve para centrar su dashboard en los módulos → temarios (C2). */}
      {user?.role !== 'profesor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card-bg border border-linea shadow-card rounded-2xl p-6">
            <SectionLabel className="mb-5">USO POR MÓDULO — 30 DÍAS</SectionLabel>
            {usageByModule.length === 0 ? (
              <EmptyState
                glyph="∅"
                title="Sin actividad todavía"
                description="Cuando tu equipo empiece a usar la plataforma, verás aquí el consumo."
              />
            ) : (
              <div className="space-y-5">
                {usageByModule.map((item) => (
                  <div key={`${item.module}-${item.action_type}`} className="flex items-center gap-3">
                    <span className="font-mono text-[13px] text-marron-soft w-28 flex-shrink-0 font-medium truncate" title={item.module}>
                      {item.module}
                    </span>
                    <ProgressBar value={Number(item.count)} max={Math.max(100, Number(item.count))} className="flex-1" />
                    <span className="font-mono text-[14px] text-tinta w-10 text-right font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-card-bg border border-linea shadow-card rounded-2xl p-6">
            <SectionLabel className="mb-5">ACTIVIDAD RECIENTE</SectionLabel>
            <RecentActivityList limit={10} />
          </div>
        </div>
      )}
    </div>
  );
}

function romanize(n) {
  const map = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return map[n - 1] || String(n);
}
