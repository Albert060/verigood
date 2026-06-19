import { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';

const STORAGE_KEY = 'vg.sidebar.stages';

function loadOpen(stageKey, fallback = true) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return typeof all[stageKey] === 'boolean' ? all[stageKey] : fallback;
  } catch {
    return fallback;
  }
}

function saveOpen(stageKey, open) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[stageKey] = open;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage lleno o bloqueado: ignorar — estado se reinicia al recargar
  }
}

// Mapa icono → glifo tipográfico (estética "cuaderno", sin dependencias extra)
const ICON_GLYPHS = {
  languages: '⌬',
  palette: '◔',
  music: '♪',
  'book-open': '§',
  users: '☉',
  award: '✓',
  globe: '◐',
  leaf: '✿',
  atom: '⊕',
  calculator: '∑',
  type: '¶',
  activity: '⚯',
  cpu: '⌨',
  cross: '✚',
  scale: '⚖',
  compass: '⌖',
  earth: '◍',
};

function glyph(icon) {
  return ICON_GLYPHS[icon] || '▢';
}

export default function SidebarStage({ stageKey, label, modules }) {
  const [open, setOpen] = useState(() => loadOpen(stageKey, true));

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      saveOpen(stageKey, next);
      return next;
    });
  }, [stageKey]);

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-5 pt-5 pb-3 text-[15px] tracking-[0.08em] text-tinta font-display font-semibold hover:text-marino transition-colors"
      >
        <span className="text-[13px] inline-block w-3 text-marron-soft">{open ? '▾' : '▸'}</span>
        <span>{label}</span>
        <span className="ml-auto font-mono text-[12px] text-marron-soft opacity-70 border border-linea px-1.5 py-0.5">
          {modules.length}
        </span>
      </button>

      {open && (
        <div>
          {modules.map((m) => (
            <NavLink
              key={m.id}
              to={m.route_prefix}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <span className="text-[18px] w-5 flex items-center justify-center flex-shrink-0">
                {glyph(m.icon)}
              </span>
              <span className="flex-1">{m.name}</span>
              {m.category === 'preparacion_examen' && (
                <span className="ml-auto font-mono text-[8px] text-marron-soft border border-linea px-1 py-0.5">
                  PREP
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
