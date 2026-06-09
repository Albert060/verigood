import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { modulesApi } from '../../services/api';
import Topbar from '../../components/layout/Topbar';
import EmptyState from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui';

// Página placeholder para módulos del catálogo que aún no tienen
// herramientas IA implementadas. La sidebar enlaza aquí y desde aquí
// el profesor puede volver al panel del centro.
//
// Cuando un módulo gane su propio layout y rutas hijas, basta con
// sustituir la ruta correspondiente en App.jsx.
export default function ModulePlaceholderPage({ moduleId }) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['modules', 'catalog'],
    queryFn: () => modulesApi.listCatalog().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const mod = data?.modules?.find((m) => m.id === moduleId);
  const stageLabel = {
    primaria: 'Primaria',
    eso: 'ESO',
    bachillerato: 'Bachillerato',
  }[mod?.stage] || (mod?.stage || '').toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-grid-paper bg-papel">
      <Topbar moduleLabel={mod ? `${stageLabel} · ${mod.name}`.toUpperCase() : 'MÓDULO'} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-10 max-w-4xl mx-auto">
          <PageHeader
            title={mod?.name || 'Módulo'}
            subtitle={mod ? `${stageLabel.toUpperCase()} · ${mod.category === 'preparacion_examen' ? 'PREPARACIÓN DE EXAMEN' : 'ASIGNATURA'}` : ''}
            romanNum="§"
          />

          <EmptyState
            glyph="◆"
            title={isLoading ? 'Cargando módulo…' : 'Próximamente'}
            description={
              isLoading
                ? ''
                : `Las herramientas IA para ${mod?.name || 'este módulo'} están en desarrollo. Te avisaremos en cuanto estén disponibles.`
            }
            cta={{ label: 'Volver al panel', onClick: () => navigate('/dashboard') }}
            secondaryCta={{ label: 'Ver módulos activos', onClick: () => navigate('/dashboard/modules') }}
          />
        </div>
      </main>
    </div>
  );
}
