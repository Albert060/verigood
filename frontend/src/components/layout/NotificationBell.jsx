import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../services/api';

const TYPE_ACCENT = {
  module_activated:    '#1F2A4D',
  module_deactivated:  '#6B1F2A',
  tool_generated:      '#1A5C35',
  exam_saved:          '#1F2A4D',
  ocr_completed:       '#1A5C35',
  invoice_paid:        '#1F2A4D',
  ai_error:            '#6B1F2A',
  system:              '#B8A988',
  // Alertas de supervisión al admin.
  teacher_first_login: '#1A5C35',  // verde — bienvenida positiva
  teacher_inactive:    '#E8D89A',  // amarillo — atención sin urgencia
  quota_warning:       '#E8D89A',  // amarillo — antes del bloqueo
  weekly_digest:       '#1F2A4D',  // marino — informativo
};

const formatRelative = (iso) => {
  if (!iso) return '';
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Polling cada 30s — suficiente para una experiencia "casi-tiempo-real" sin
  // sobrecargar al servidor. WebSockets quedan para una fase posterior si hace
  // falta presión adicional sobre la inmediatez.
  const { data: countData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: listData } = useQuery({
    queryKey: ['notifications-list'],
    queryFn: () => notificationsApi.list({ limit: 12 }).then((r) => r.data),
    enabled: open,
    staleTime: 5_000,
  });

  const markRead = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      qc.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      qc.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = countData?.count || 0;
  const items = listData?.notifications || [];

  const openItem = (n) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notificaciones${count > 0 ? ` (${count} sin leer)` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-papel-hover transition-colors"
      >
        <span className="text-[18px] text-tinta leading-none">◔</span>
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-granate text-papel font-mono text-[9px] font-bold rounded-full">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-papel border border-linea shadow-card-hover rounded-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-linea flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-[0.15em] text-marron-soft uppercase">Notificaciones</p>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="font-mono text-[10px] text-marino hover:text-granate transition-colors"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {items.length === 0 && (
            <div className="px-4 py-8 text-center">
              <div className="font-display italic text-[28px] text-[rgba(184,169,136,0.3)] mb-1">§</div>
              <p className="font-mono text-[11px] text-marron-soft">No hay notificaciones</p>
            </div>
          )}

          {items.length > 0 && (
            <ul className="max-h-96 overflow-y-auto divide-y divide-[rgba(184,169,136,0.3)]">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-papel-hover transition-colors flex items-start gap-3 ${
                      !n.readAt ? 'bg-[rgba(232,216,154,0.12)]' : ''
                    }`}
                  >
                    <span
                      className="w-1 h-10 flex-shrink-0 mt-0.5"
                      style={{ background: TYPE_ACCENT[n.type] || '#B8A988' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-tight truncate ${n.readAt ? 'text-tinta/80' : 'text-tinta font-medium'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[11px] text-marron-soft mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="font-mono text-[10px] text-marron-soft mt-1">{formatRelative(n.createdAt)}</p>
                    </div>
                    {!n.readAt && (
                      <span className="w-1.5 h-1.5 bg-granate rounded-full flex-shrink-0 mt-2" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
