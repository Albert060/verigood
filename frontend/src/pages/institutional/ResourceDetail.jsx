import { Fragment } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryApi, modulesApi } from '../../services/api';
import { PageHeader, Button, SectionLabel, Card } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';
import ResultRenderer from '../../components/tools/results/ResultRenderer';

const KIND_LABELS = {
  exam: 'Examen', exercise_set: 'Ejercicios', text: 'Texto',
  rubric: 'Rúbrica', timeline: 'Línea de tiempo', quiz: 'Cuestionario',
  commentary: 'Comentario',
};

// pdfService entiende cada output_kind directamente.
const pdfTypeFor = (kind) => kind || 'sheet';

export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: ['library-item', id],
    queryFn: () => libraryApi.get(id).then((r) => r.data.item),
    enabled: !!id,
  });

  const { data: catalogData } = useQuery({
    queryKey: ['modules', 'catalog'],
    queryFn: () => modulesApi.listCatalog().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: () => libraryApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-items'] });
      navigate('/dashboard/resources');
    },
  });

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="animate-slide-in">
        <PageHeader title="Recurso no encontrado" subtitle="BIBLIOTECA" romanNum="§" />
        <Button variant="ghost" onClick={() => navigate('/dashboard/resources')}>← Volver a Biblioteca</Button>
      </div>
    );
  }

  const mod = (catalogData?.modules || []).find((m) => m.id === item.moduleId);
  const pdfType = pdfTypeFor(item.kind);
  const input = item.metadata?.input || {};

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={item.title}
        subtitle={`${mod?.name || item.moduleId} · ${KIND_LABELS[item.kind] || item.kind} · ${formatDate(item.createdAt)}`}
        romanNum="§ IV.II"
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Button variant="ghost" onClick={() => navigate('/dashboard/resources')}>← Volver a Biblioteca</Button>
        <DownloadPdfButton
          type={pdfType}
          data={item.payload}
          title={item.title}
          subtitle={`${mod?.name || item.moduleId} · ${KIND_LABELS[item.kind] || item.kind}`}
          moduleKey={item.moduleId}
          filename={`${item.title.replace(/\s+/g, '-').toLowerCase().slice(0, 60)}-${item.id.slice(0, 6)}`}
          label="Descargar PDF"
        />
        <Button
          variant="ghost"
          loading={deleting}
          onClick={() => {
            if (window.confirm('¿Eliminar este recurso de la biblioteca?')) doDelete();
          }}
        >
          Eliminar
        </Button>
      </div>

      <Card className="p-5 mb-4">
        <SectionLabel className="mb-3">DATOS</SectionLabel>
        <div className="grid grid-cols-2 gap-y-2 text-[12.5px]">
          <div className="text-marron-soft font-mono text-[11px]">Profesor</div>
          <div className="text-tinta">{item.teacherName || '—'}</div>
          <div className="text-marron-soft font-mono text-[11px]">Herramienta</div>
          <div className="text-tinta">{item.metadata?.toolName || item.toolKey || '—'}</div>
          <div className="text-marron-soft font-mono text-[11px]">Tipo</div>
          <div className="text-tinta">{KIND_LABELS[item.kind] || item.kind}</div>
          <div className="text-marron-soft font-mono text-[11px]">Creado</div>
          <div className="text-tinta">{formatDate(item.createdAt)}</div>
          {Object.entries(input).map(([k, v]) => (
            v ? (
              <Fragment key={k}>
                <div className="text-marron-soft font-mono text-[11px]">{k}</div>
                <div className="text-tinta truncate">{typeof v === 'string' ? v : JSON.stringify(v)}</div>
              </Fragment>
            ) : null
          ))}
        </div>
      </Card>

      <SectionLabel className="mb-3">CONTENIDO</SectionLabel>
      <ResultRenderer kind={item.kind} data={item.payload} />
    </div>
  );
}

