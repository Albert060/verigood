import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { modulesApi } from '../../services/api';
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
];

export default function InstitutionalLayout() {
  const { user } = useAuthStore();
  const orgId = user?.orgId || user?.organization_id;

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
    <div className="h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
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
        <main className="flex-1 overflow-y-auto">
          <div className="p-10 max-w-6xl">
            <DemoBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
