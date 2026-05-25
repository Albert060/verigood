import { Outlet } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';
import DemoBanner from '../../components/ui/DemoBanner';

const MENU = [
  { to: '/cambridge', label: 'Inicio', icon: '▣', end: true },
  { to: '/cambridge/exams/new', label: 'Nuevo examen', icon: '✏' },
  { to: '/cambridge/exams', label: 'Mis exámenes', icon: '▤' },
  { to: '/cambridge/ocr', label: 'Corrector OCR', icon: '✓' },
  { to: '/cambridge/dynamics', label: 'Dinámicas', icon: '◆' },
  { to: '/cambridge/presentations', label: 'Presentaciones', icon: '▥' },
];

export default function CambridgeLayout() {
  return (
    <div className="h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar moduleLabel="CAMBRIDGE" moduleColor="#1F2A4D" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarSection label="CAMBRIDGE · INGLÉS" />
          {MENU.map((item) => <SidebarItem key={item.to} {...item} />)}
          <SidebarSection label="NAVEGACIÓN" />
          <SidebarItem to="/dashboard" label="Panel del centro" icon="←" />
        </Sidebar>
        <main className="flex-1 overflow-y-auto">
          <div className="h-0.5 bg-marino opacity-30" />
          <div className="p-7 max-w-4xl">
            <DemoBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
