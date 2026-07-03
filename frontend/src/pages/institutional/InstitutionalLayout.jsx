import { useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { authApi, modulesApi } from '../../services/api';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';
import SidebarStage from '../../components/layout/SidebarStage';
import DemoBanner from '../../components/ui/DemoBanner';

const STAGE_LABELS = { primaria: 'Primaria', eso: 'ESO', bachillerato: 'Bachillerato' };
const STAGE_ORDER = ['primaria', 'eso', 'bachillerato'];

const ADMIN_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '▣', end: true },
  { to: '/dashboard/users', label: 'Profesores', icon: '◎' },
  { to: '/dashboard/modules', label: 'Módulos', icon: '◆' },
  { to: '/dashboard/resources', label: 'Biblioteca', icon: '▤' },
  { to: '/dashboard/stats', label: 'Estadísticas', icon: '▥' },
  { to: '/dashboard/billing', label: 'Facturación', icon: '₪' },
  { to: '/dashboard/anthropic', label: 'Configurar IA', icon: '◉' },
];

export default function InstitutionalLayout() {
  const { user, updateUser } = useAuthStore();

  // Refrescar el perfil desde el backend al entrar al layout. Es crítico
  // porque el authStore se persiste en localStorage y puede quedar con campos
  // obsoletos (p.ej. orgId ausente si el usuario se logueó antes de un cambio
  // de backend). Sin un orgId válido, getStats no se ejecuta y el dashboard
  // muestra "sin actividad" aunque la BD tenga registros.
  const { data: meData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then((r) => r.data),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (meData && (meData.orgId !== user?.orgId || meData.orgName !== user?.orgName)) {
      updateUser({
        orgId: meData.orgId,
        orgName: meData.orgName,
        plan: meData.plan,
        activeModules: meData.activeModules,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meData?.orgId, meData?.orgName]);

  // Usamos preferentemente el orgId fresco de /auth/me. Si aún no ha llegado,
  // caemos al del authStore. Esto evita una ventana inicial en la que
  // getStats no se ejecuta porque user.orgId es undefined.
  const orgId = meData?.orgId || user?.orgId || user?.organization_id;

  const { data } = useQuery({
    queryKey: ['modules', 'org', orgId],
    queryFn: () => modulesApi.listOrgModules(orgId).then((r) => r.data),
    enabled: !!orgId,
    staleTime: 60_000,
  });

  // Agrupar los módulos activos por etapa, sólo las que tienen contenido.
  const stages = useMemo(() => {
    const modules = data?.modules || [];
    const byStage = {};
    modules.forEach((m) => {
      if (!byStage[m.stage]) byStage[m.stage] = [];
      byStage[m.stage].push(m);
    });
    return STAGE_ORDER
      .filter((s) => byStage[s]?.length)
      .map((s) => ({
        key: s,
        label: STAGE_LABELS[s] || s,
        modules: byStage[s].sort((a, b) => a.sort_order - b.sort_order),
      }));
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar />
      <div className="flex flex-1">
        <Sidebar>
          {stages.length > 0 && <SidebarSection label="HERRAMIENTAS IA" />}
          {stages.map((s) => (
            <SidebarStage key={s.key} stageKey={s.key} label={s.label} modules={s.modules} />
          ))}

          {user?.role === 'admin_centro' && (
            <>
              <SidebarSection label="GESTIÓN" />
              {ADMIN_ITEMS.map((item) => (
                <SidebarItem key={item.to} {...item} />
              ))}
            </>
          )}

          {user?.role === 'profesor' && (
            <>
              <SidebarSection label="MI CUENTA" />
              <SidebarItem to="/dashboard/resources" label="Biblioteca" icon="▤" />
            </>
          )}
        </Sidebar>
        <main className="flex-1 min-w-0">
          <div className="p-4 md:p-8 lg:p-10 w-full max-w-6xl">
            <DemoBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
