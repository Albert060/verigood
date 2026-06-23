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
  return (
    <aside className="w-[260px] flex-shrink-0 bg-sidebar-bg border-r border-linea overflow-y-auto py-3">
      {children}
    </aside>
  );
}
