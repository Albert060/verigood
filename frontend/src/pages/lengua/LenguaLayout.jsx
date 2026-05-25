import { Outlet } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';
import DemoBanner from '../../components/ui/DemoBanner';

const MENU = [
  { to: '/lengua', label: 'Inicio', icon: '▣', end: true },
  { to: '/lengua/ejercicios', label: 'Generador ejercicios', icon: '✏' },
  { to: '/lengua/redaccion', label: 'Corrector redacción', icon: '✓' },
  { to: '/lengua/sintaxis', label: 'Análisis sintáctico', icon: '◈' },
  { to: '/lengua/comentario', label: 'Comentario de texto', icon: '◆' },
  { to: '/lengua/dinamicas', label: 'Dinámicas', icon: '◉' },
];

export default function LenguaLayout() {
  return (
    <div className="h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar moduleLabel="LENGUA" moduleColor="#6B1F2A" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarSection label="LENGUA CASTELLANA" />
          {MENU.map((item) => <SidebarItem key={item.to} {...item} />)}
          <SidebarSection label="NAVEGACIÓN" />
          <SidebarItem to="/dashboard" label="Panel del centro" icon="←" />
        </Sidebar>
        <main className="flex-1 overflow-y-auto">
          <div className="h-0.5 bg-granate opacity-30" />
          <div className="p-7 max-w-4xl">
            <DemoBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
