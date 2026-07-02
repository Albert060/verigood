import { NavLink } from 'react-router-dom';

export function SidebarSection({ label }) {
  return (
    <div className="px-5 pt-4 pb-1.5 text-[10.5px] tracking-[0.12em] text-marron-soft font-mono font-semibold">{label}</div>
  );
}

export function SidebarItem({ to, icon, label, badge, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? 'active' : ''}`
      }
    >
      {icon && <span className="text-[15px] w-4 flex items-center justify-center flex-shrink-0">{icon}</span>}
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto font-mono text-[10.5px] bg-granate text-papel px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </NavLink>
  );
}

export default function Sidebar({ children }) {
  // Sticky bajo la Topbar (h-16 = 4rem). El min-h asegura que el fondo del
  // panel siempre cubre desde debajo del Topbar hasta el borde inferior del
  // viewport aunque el contenido del menú sea corto — evita ver el fondo de
  // rejilla asomando debajo. El max-h + overflow-y-auto sigue permitiendo
  // scroll interno si el menú fuera muy largo.
  return (
    <aside
      className="w-[260px] flex-shrink-0 bg-sidebar-bg border-r border-linea py-3 sticky top-16 self-start min-h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-y-auto"
    >
      {children}
    </aside>
  );
}
