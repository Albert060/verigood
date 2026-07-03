import { create } from 'zustand';

// Estado del drawer de navegación en móvil. La Topbar tiene un botón
// hamburguesa (md:hidden) que hace toggle; la Sidebar renderiza un overlay
// fijo cuando isOpen === true (también md:hidden). En desktop (md+) el
// drawer no aplica: la Sidebar renderiza en flujo normal como siempre.
export const useMobileMenu = create((set) => ({
  isOpen: false,
  open:  () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
