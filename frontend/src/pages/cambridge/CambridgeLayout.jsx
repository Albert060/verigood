import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { modulesApi, moduleToolsApi } from '../../services/api';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';
import DemoBanner from '../../components/ui/DemoBanner';

// Menú Cambridge — mismo patrón que ModuleLayout genérico:
// Temario primero, Herramientas segundo, Corregir ejercicio tercero,
// después las páginas específicas del módulo (exámenes, dinámicas, presentaciones).
const MENU = [
  { to: '/cambridge',                label: 'Temario',            icon: '▤', end: true },
  { to: '/cambridge/herramientas',   label: 'Herramientas',       icon: '◫' },
  { to: '/cambridge/ocr',            label: 'Corregir ejercicio', icon: '✓' },
];
const MENU_SECONDARY = [
  { to: '/cambridge/exams/new',      label: 'Nuevo examen',   icon: '✏' },
  { to: '/cambridge/exams',          label: 'Mis exámenes',   icon: '▤' },
  { to: '/cambridge/dynamics',       label: 'Dinámicas',      icon: '◆' },
  { to: '/cambridge/presentations',  label: 'Presentaciones', icon: '▥' },
];

export default function CambridgeLayout() {
  // Contexto que ModuleSyllabus (reutilizado en /cambridge index) espera:
  //   moduleId, mod, tools, ocrEnabled.
  const { data: catalogData } = useQuery({
    queryKey: ['modules', 'catalog'],
    queryFn: () => modulesApi.listCatalog().then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const { data: toolsData } = useQuery({
    queryKey: ['module-tools', 'cambridge'],
    queryFn: () => moduleToolsApi.list('cambridge').then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const mod = catalogData?.modules?.find((m) => m.id === 'cambridge');
  const tools = toolsData?.tools || [];
  const outletCtx = { moduleId: 'cambridge', mod, tools, ocrEnabled: true };

  return (
    <div className="min-h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar moduleLabel="CAMBRIDGE" moduleColor="#1F2A4D" />
      <div className="flex flex-1">
        <Sidebar>
          <SidebarSection label="CAMBRIDGE · INGLÉS" />
          {MENU.map((item) => <SidebarItem key={item.to} {...item} />)}
          <SidebarSection label="HERRAMIENTAS" />
          {MENU_SECONDARY.map((item) => <SidebarItem key={item.to} {...item} />)}
          <SidebarSection label="NAVEGACIÓN" />
          <SidebarItem to="/dashboard" label="Panel del centro" icon="←" />
        </Sidebar>
        <main className="flex-1">
          <div className="p-7 max-w-4xl">
            <DemoBanner />
            <Outlet context={outletCtx} />
          </div>
        </main>
      </div>
    </div>
  );
}
