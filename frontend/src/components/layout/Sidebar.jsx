import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useMobileMenu } from '../../stores/mobileMenuStore';

export function SidebarSection({ label }) {
  return (
    <div className="px-5 pt-4 pb-1.5 text-[10.5px] tracking-[0.12em] text-marron-soft font-mono font-semibold">{label}</div>
  );
}

export function SidebarItem({ to, icon, label, badge, end = false }) {
  const closeMenu = useMobileMenu((s) => s.close);
  return (
    <NavLink
      to={to}
      end={end}
      onClick={closeMenu}
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

// Sidebar responsive:
//  - md+ (desktop / tablet ancho): sticky bajo la Topbar, en el flujo del
//    layout, como siempre.
//  - < md (móvil): fuera de flujo, drawer que entra por la izquierda con un
//    backdrop semi-transparente. Se cierra al pulsar backdrop, al pulsar
//    Escape, o al navegar (los SidebarItem llaman a closeMenu).
export default function Sidebar({ children }) {
  const isOpen = useMobileMenu((s) => s.isOpen);
  const close  = useMobileMenu((s) => s.close);

  // Cerrar con Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // Bloquear scroll del body cuando el drawer está abierto en móvil.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop móvil */}
      {isOpen && (
        <div
          onClick={close}
          className="md:hidden fixed inset-0 bg-tinta/40 z-30 animate-fade-in"
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          // Común (aplica en ambos breakpoints)
          'bg-sidebar-bg border-r border-linea py-3 overflow-y-auto',
          // MÓVIL (< md): drawer fijo bajo la Topbar. z-30 para quedar sobre
          // el contenido pero por debajo de la Topbar (que es z-40). Se mueve
          // con translate-x según isOpen. Usamos max-md: para NO aplicar en
          // md+ y evitar cualquier conflicto de `position`.
          'max-md:fixed max-md:top-16 max-md:left-0 max-md:z-30',
          'max-md:w-[80vw] max-md:max-w-[300px] max-md:h-[calc(100vh-4rem)]',
          'max-md:transition-transform max-md:duration-200 max-md:ease-out',
          isOpen ? 'max-md:translate-x-0 max-md:shadow-card-hover' : 'max-md:-translate-x-full',
          // DESKTOP / TABLET (md+): sticky en el flujo del flex row, siempre
          // debajo de la Topbar y por delante del contenido pero sin superponerse.
          'md:sticky md:top-16 md:z-10 md:self-start md:flex-shrink-0',
          'md:w-[260px] md:min-h-[calc(100vh-4rem)] md:max-h-[calc(100vh-4rem)]',
        ].join(' ')}
      >
        {children}
      </aside>
    </>
  );
}
