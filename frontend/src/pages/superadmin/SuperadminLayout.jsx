import { Outlet } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';

const MENU = [
  { to: '/superadmin', label: 'Dashboard', icon: '▣', end: true },
  { to: '/superadmin/organizations', label: 'Organizaciones', icon: '◎' },
  { to: '/superadmin/users', label: 'Usuarios', icon: '☰' },
  { to: '/superadmin/modules', label: 'Módulos', icon: '◫' },
  { to: '/superadmin/stats', label: 'Estadísticas', icon: '▤' },
  { to: '/superadmin/billing', label: 'Facturación global', icon: '₪' },
  { to: '/superadmin/system', label: 'Sistema', icon: '⚙' },
];

export default function SuperadminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar moduleLabel="SUPERADMIN" moduleColor="#6B1F2A" />
      <div className="flex flex-1">
        <Sidebar>
          <SidebarSection label="ADMINISTRACIÓN" />
          {MENU.map((item) => (
            <SidebarItem key={item.to} {...item} />
          ))}
        </Sidebar>
        <main className="flex-1 min-w-0">
          <div className="p-4 md:p-7 w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
