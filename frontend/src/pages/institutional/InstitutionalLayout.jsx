import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Topbar from '../../components/layout/Topbar';
import Sidebar, { SidebarItem, SidebarSection } from '../../components/layout/Sidebar';
import DemoBanner from '../../components/ui/DemoBanner';

const MODULE_ROUTES = [
  { module: 'cambridge', to: '/cambridge', label: 'Inglés / Cambridge', icon: '✏' },
  { module: 'espanol', to: '/lengua', label: 'Lengua Castellana', icon: '§' },
  { module: 'matematicas', to: '/matematicas', label: 'Matemáticas', icon: '∑' },
  { module: 'medio', to: '/medio', label: 'C. del Medio', icon: '◉' },
  { module: 'oposiciones', to: '/oposiciones', label: 'Oposiciones', icon: '⊞' },
];

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
  const navigate = useNavigate();
  const activeModules = user?.activeModules || [];

  return (
    <div className="h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarSection label="HERRAMIENTAS IA" />
          {MODULE_ROUTES.filter((m) => activeModules.includes(m.module)).map((item) => (
            <SidebarItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
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
