import { useQuery } from '@tanstack/react-query';
import { pdfApi } from '../../services/api';

/**
 * Small banner shown when the backend is running without an Anthropic API key.
 * The generators still work but produce pre-loaded sample content.
 */
export default function DemoBanner() {
  const { data } = useQuery({
    queryKey: ['pdf-status'],
    queryFn: () => pdfApi.status().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  if (!data?.demoMode) return null;

  return (
    <div className="bg-[rgba(232,216,154,0.35)] border border-amarillo px-5 py-3 mb-6 rounded-xl flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-amarillo flex items-center justify-center font-display italic font-bold text-[#7A5A1E] flex-shrink-0">
        i
      </div>
      <div className="flex-1">
        <div className="font-semibold text-[14px] text-[#7A5A1E] leading-tight">
          Modo demo — sin clave de IA
        </div>
        <div className="font-mono text-[12px] text-[#7A5A1E]/80 leading-snug">
          Los generadores devuelven contenido pre-cargado para que puedas probar el flujo completo y descargar PDFs. Añade <code className="font-mono">ANTHROPIC_API_KEY</code> en <code className="font-mono">backend/.env</code> y reinicia el backend para activar la generación real.
        </div>
      </div>
    </div>
  );
}
