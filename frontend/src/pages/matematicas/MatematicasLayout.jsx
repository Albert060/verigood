import { Outlet } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';
import DemoBanner from '../../components/ui/DemoBanner';

const MENU = [
  { to: '/matematicas', label: 'Inicio', icon: '▣', end: true },
  { to: '/matematicas/problemas', label: 'Generador problemas', icon: '✏' },
  { to: '/matematicas/corrector', label: 'Corrector foto', icon: '✓' },
  { to: '/matematicas/series', label: 'Series y ejercicios', icon: '◈' },
];

export default function MatematicasLayout() {
  return (
    <div className="h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar moduleLabel="MATEMÁTICAS" moduleColor="#2D4A6A" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarSection label="MATEMÁTICAS" />
          {MENU.map((item) => <SidebarItem key={item.to} {...item} />)}
          <SidebarSection label="NAVEGACIÓN" />
          <SidebarItem to="/dashboard" label="Panel del centro" icon="←" />
        </Sidebar>
        <main className="flex-1 overflow-y-auto">
          <div className="h-0.5 bg-[#2D4A6A] opacity-30" />
          <div className="p-7 max-w-4xl">
            <DemoBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
