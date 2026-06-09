import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { modulesApi, moduleToolsApi } from '../../services/api';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';
import DemoBanner from '../../components/ui/DemoBanner';

const STAGE_LABEL = { primaria: 'PRIMARIA', eso: 'ESO', bachillerato: 'BACHILLERATO' };

// Layout genérico para CUALQUIER módulo cuyo catálogo declare tools.
// Hace dos queries:
//   1. modules catalog → metadatos del módulo (nombre, etapa, categoría)
//   2. module tools     → lista de herramientas vinculadas (renderizadas en sidebar)
// El <Outlet/> renderiza ModuleHome (si index) o ToolPage (si :toolKey).
export default function ModuleLayout({ moduleId }) {
  const navigate = useNavigate();

  const { data: catalogData } = useQuery({
    queryKey: ['modules', 'catalog'],
    queryFn: () => modulesApi.listCatalog().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: toolsData, isLoading: loadingTools } = useQuery({
    queryKey: ['module-tools', moduleId],
    queryFn: () => moduleToolsApi.list(moduleId).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const mod = catalogData?.modules?.find((m) => m.id === moduleId);
  const tools = toolsData?.tools || [];
  const stageLabel = STAGE_LABEL[mod?.stage] || '';
  const moduleLabel = mod ? `${stageLabel} · ${mod.name}`.toUpperCase() : 'MÓDULO';
  // Las rutas de tools cuelgan del route_prefix del módulo, definido en el
  // catálogo (p.ej. '/eso/geh'). Mientras el módulo no haya cargado, usamos
  // '#' para no generar NavLinks rotos.
  const base = mod?.route_prefix || '#';

  return (
    <div className="h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar moduleLabel={moduleLabel} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarSection label={moduleLabel} />
          <SidebarItem to={base} label="Inicio" icon="▣" end />
          {loadingTools && (
            <div className="px-5 py-2 font-mono text-[11px] text-marron-soft">
              Cargando herramientas…
            </div>
          )}
          {!loadingTools && tools.length === 0 && (
            <div className="px-5 py-2 font-mono text-[11px] text-marron-soft">
              Sin herramientas disponibles.
            </div>
          )}
          {tools.map((t) => (
            <SidebarItem
              key={t.key}
              to={`${base}/${t.key}`}
              icon="◆"
              label={t.name}
            />
          ))}
          <SidebarSection label="NAVEGACIÓN" />
          <SidebarItem to="/dashboard" label="Panel del centro" icon="←" />
        </Sidebar>
        <main className="flex-1 overflow-y-auto">
          <div className="h-0.5 bg-marino opacity-30" />
          <div className="p-7 max-w-4xl">
            <DemoBanner />
            <Outlet context={{ moduleId, mod, tools }} />
          </div>
        </main>
      </div>
    </div>
  );
}
