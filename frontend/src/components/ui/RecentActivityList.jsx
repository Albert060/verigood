import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { orgApi } from '../../services/api';

// Mapeo de action_type → color de acento y label legible. Cubre Cambridge y
// las tools del catálogo Fase 1. Si llega un action_type desconocido, se pinta
// con color línea y se muestra el string crudo (que ya es legible: 'tool:...').
const ACTION_META = {
  exam_generate:         { color: '#1F2A4D', label: 'Examen generado' },
  exam_save:             { color: '#1F2A4D', label: 'Examen guardado' },
  ocr_correct:           { color: '#2D6A4F', label: 'Corrección OCR' },
  dynamics_generate:     { color: '#6B1F2A', label: 'Dinámica generada' },
  presentation_generate: { color: '#2D4A6A', label: 'Presentación' },
  photo_correct:         { color: '#2D6A4F', label: 'Corrección por foto' },
  problems_generate:     { color: '#1F2A4D', label: 'Problemas generados' },
  series_generate:       { color: '#1F2A4D', label: 'Serie de ejercicios' },
  essay_correct:         { color: '#2D6A4F', label: 'Redacción corregida' },
  exercises_generate:    { color: '#1F2A4D', label: 'Ejercicios generados' },
  syntax_analyze:        { color: '#2D4A6A', label: 'Análisis sintáctico' },
  commentary_generate:   { color: '#1A5C35', label: 'Comentario de texto' },
  sheet_generate:        { color: '#1A5C35', label: 'Ficha temática' },
  quiz_generate:         { color: '#1A5C35', label: 'Cuestionario' },
  stem_generate:         { color: '#2D4A6A', label: 'Actividad STEM' },
};

const formatRelative = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
};

const metaFor = (actionType) => {
  if (ACTION_META[actionType]) return ACTION_META[actionType];
  // El dispatcher de tools genera action_type = 'tool:<key>' → mostramos la key
  if (typeof actionType === 'string' && actionType.startsWith('tool:')) {
    return { color: '#1F2A4D', label: `Tool: ${actionType.slice(5)}` };
  }
  return { color: '#B8A988', label: actionType || '—' };
};

/**
 * Lista de actividad reciente del centro, opcionalmente filtrada por módulo.
 *
 * Lee de orgApi.getStats(orgId) — que ya devuelve recentActivity con datos
 * reales de usage_logs (joined con users). Si no hay datos, muestra un
 * EmptyState consistente con el resto de la app.
 *
 * @param {string} [moduleFilter] - p.ej. 'cambridge', 'espanol', 'matematicas'
 *                                  Si se omite, muestra TODA la actividad.
 * @param {number} [limit=6]
 */
export default function RecentActivityList({ moduleFilter, limit = 6 }) {
  const { user } = useAuthStore();
  const orgId = user?.orgId || user?.organization_id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: () => orgApi.getStats(orgId).then((r) => r.data),
    enabled: !!orgId,
    refetchInterval: 60_000, // refresca cada minuto
    refetchOnWindowFocus: true,
  });

  const items = useMemo(() => {
    const all = stats?.recentActivity || [];
    const filtered = moduleFilter ? all.filter((a) => a.module === moduleFilter) : all;
    return filtered.slice(0, limit);
  }, [stats, moduleFilter, limit]);

  return (
    <div className="bg-card-bg border border-linea shadow-card">
      {isLoading && (
        <div className="px-4 py-6 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-marino border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="px-4 py-8 text-center">
          <div className="font-display italic text-[26px] text-[rgba(184,169,136,0.3)] mb-1">§</div>
          <p className="font-mono text-[11px] text-marron-soft">Aún no hay actividad reciente.</p>
          <p className="font-mono text-[10px] text-marron-soft mt-1">
            Las acciones de tu equipo aparecerán aquí en tiempo real.
          </p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="divide-y divide-[rgba(184,169,136,0.25)]">
          {items.map((act, i) => {
            const meta = metaFor(act.action_type);
            return (
              <div key={`${act.created_at}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[12.5px] text-tinta">{meta.label}</span>
                  {!moduleFilter && act.module && (
                    <span className="font-mono text-[10px] text-marron-soft ml-2">· {act.module}</span>
                  )}
                  {act.user_name && (
                    <span className="font-mono text-[10px] text-marron-soft ml-2">· {act.user_name}</span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-marron-soft flex-shrink-0">
                  {formatRelative(act.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
