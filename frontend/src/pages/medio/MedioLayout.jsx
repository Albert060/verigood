import { Outlet } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';
import DemoBanner from '../../components/ui/DemoBanner';

const MENU = [
  { to: '/medio', label: 'Inicio', icon: '▣', end: true },
  { to: '/medio/fichas', label: 'Fichas temáticas', icon: '✏' },
  { to: '/medio/cuestionarios', label: 'Cuestionarios', icon: '◆' },
  { to: '/medio/stem', label: 'Actividades STEM', icon: '◈' },
];

export default function MedioLayout() {
  return (
    <div className="h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar moduleLabel="C. DEL MEDIO" moduleColor="#1A5C35" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarSection label="CONOCIMIENTO DEL MEDIO" />
          {MENU.map((item) => <SidebarItem key={item.to} {...item} />)}
          <SidebarSection label="NAVEGACIÓN" />
          <SidebarItem to="/dashboard" label="Panel del centro" icon="←" />
        </Sidebar>
        <main className="flex-1 overflow-y-auto">
          <div className="h-0.5 bg-[#1A5C35] opacity-30" />
          <div className="p-7 max-w-4xl">
            <DemoBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
