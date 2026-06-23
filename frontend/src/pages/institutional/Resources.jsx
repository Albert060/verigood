import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { cambridgeApi, libraryApi, pdfApi, modulesApi } from '../../services/api';
import { PageHeader, SectionLabel, Button } from '../../components/ui';

const KIND_LABELS = {
  exam:         'Examen',
  exercise_set: 'Ejercicios',
  text:         'Texto',
  rubric:       'Rúbrica',
  timeline:     'Línea de tiempo',
  quiz:         'Cuestionario',
  commentary:   'Comentario',
};

// El backend pdfService entiende ahora cada output_kind directamente.
// El kind especial 'exam' (Cambridge) tiene su propio renderer (renderExam).
const PDF_TYPE_BY_KIND = (kind) => kind || 'sheet';

// Biblioteca unificada: lee tanto los exámenes Cambridge legacy (tabla `exams`)
// como los items genéricos guardados desde cualquier tool (`library_items`).
// No duplica storage: el PDF se regenera on-demand desde el payload.
export default function InstitutionalResources() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: catalogData } = useQuery({
    queryKey: ['modules', 'catalog'],
    queryFn: () => modulesApi.listCatalog().then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { data: exams = [], isLoading: loadingExams } = useQuery({
    queryKey: ['cambridge-exams'],
    queryFn: () => cambridgeApi.getExams(),
    select: (r) => r.data.exams || [],
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['library-items'],
    queryFn: () => libraryApi.list(),
    select: (r) => r.data.items || [],
  });

  // Forma uniforme para la UI. Cada origen aporta lo que tiene.
  const resources = useMemo(() => {
    const examRows = exams.map((e) => ({
      id: e.id,
      source: 'cambridge_exam',
      moduleId: 'cambridge',
      kind: 'exam',
      title: e.title,
      subtitle: e.topic,
      teacher: e.teacherName || '—',
      date: e.createdAt,
      tags: [e.level, ...(e.exerciseTypes || []).slice(0, 2).map((t) => t.replace(/_/g, ' '))].filter(Boolean),
    }));
    const itemRows = items.map((it) => ({
      id: it.id,
      source: 'library_item',
      moduleId: it.moduleId,
      kind: it.kind,
      title: it.title,
      subtitle: it.metadata?.input?.topic || it.metadata?.input?.theme || it.metadata?.toolName,
      teacher: it.teacherName || '—',
      date: it.createdAt,
      tags: [
        it.metadata?.input?.course,
        it.metadata?.input?.level,
        it.metadata?.input?.focus,
      ].filter(Boolean),
    }));
    return [...examRows, ...itemRows].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [exams, items]);

  const moduleLookup = useMemo(() => {
    const map = {};
    (catalogData?.modules || []).forEach((m) => { map[m.id] = m; });
    map.cambridge = map.cambridge || { id: 'cambridge', name: 'Cambridge', stage: 'eso' };
    return map;
  }, [catalogData]);

  const modulesPresent = useMemo(() => {
    const s = new Set(resources.map((r) => r.moduleId));
    return Array.from(s);
  }, [resources]);

  const kindsPresent = useMemo(() => {
    const s = new Set(resources.map((r) => r.kind));
    return Array.from(s);
  }, [resources]);

  const filtered = resources.filter((r) => {
    if (moduleFilter !== 'all' && r.moduleId !== moduleFilter) return false;
    if (kindFilter !== 'all' && r.kind !== kindFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = (r.title || '').toLowerCase().includes(q) || (r.subtitle || '').toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const { mutate: doDelete, isPending: deleting } = useMutation({
    mutationFn: (resource) => {
      if (resource.source === 'cambridge_exam') return cambridgeApi.deleteExam(resource.id);
      return libraryApi.remove(resource.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cambridge-exams'] });
      qc.invalidateQueries({ queryKey: ['library-items'] });
    },
  });

  const handleDownload = async (resource) => {
    setDownloadingId(resource.id);
    try {
      let pdfData, pdfType;
      if (resource.source === 'cambridge_exam') {
        const full = await cambridgeApi.getExam(resource.id).then((r) => r.data.exam);
        pdfType = 'exam';
        pdfData = { title: full.title, level: full.level, topic: full.topic, questions: full.questions || [] };
      } else {
        const full = await libraryApi.get(resource.id).then((r) => r.data.item);
        pdfType = PDF_TYPE_BY_KIND(full.kind);
        pdfData = full.payload;
      }
      const mod = moduleLookup[resource.moduleId];
      await pdfApi.download({
        type: pdfType,
        data: pdfData,
        title: resource.title,
        subtitle: `${mod?.name || resource.moduleId} · ${KIND_LABELS[resource.kind] || resource.kind}`,
        moduleKey: resource.moduleId,
        filename: `${(resource.title || resource.kind).replace(/\s+/g, '-').toLowerCase().slice(0, 60)}-${resource.id.slice(0, 6)}`,
      });
    } catch (e) {
      console.error('Biblioteca: descarga falló', e);
      window.alert('No se pudo generar el PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpen = (resource) => {
    if (resource.source === 'cambridge_exam') {
      navigate(`/cambridge/exams/${resource.id}`);
    } else {
      navigate(`/dashboard/resources/${resource.id}`);
    }
  };

  const isLoading = loadingExams || loadingItems;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Biblioteca"
        subtitle="RECURSOS GUARDADOS · PDF DESCARGABLE"
        romanNum="§ IV"
        actions={
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            ← Volver al Dashboard
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <input
          className="vg-input flex-1"
          placeholder="Buscar por título o tema..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-card-bg border border-linea shadow-card p-3 mb-5">
        <SectionLabel className="mb-2">FILTROS</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block font-mono text-[10px] text-marron-soft mb-1 tracking-[0.1em]">MÓDULO</span>
            <select className="vg-select w-full" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="all">Todos</option>
              {modulesPresent.map((m) => (
                <option key={m} value={m}>{moduleLookup[m]?.name || m}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] text-marron-soft mb-1 tracking-[0.1em]">TIPO</span>
            <select className="vg-select w-full" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
              <option value="all">Todos</option>
              {kindsPresent.map((k) => (
                <option key={k} value={k}>{KIND_LABELS[k] || k}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading && (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <div className="font-display italic text-[36px] text-[rgba(184,169,136,0.3)]">§</div>
          <p className="font-mono text-[11px] text-marron-soft">
            {search || moduleFilter !== 'all' || kindFilter !== 'all'
              ? 'Sin resultados con los filtros actuales'
              : 'La biblioteca está vacía'}
          </p>
          <p className="font-mono text-[10px] text-marron-soft">
            Genera un recurso en cualquier módulo y púlsalo "Guardar en biblioteca".
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((res) => {
            const mod = moduleLookup[res.moduleId];
            return (
              <div key={`${res.source}:${res.id}`} className="bg-card-bg border border-linea shadow-card card-fold p-4 flex items-start gap-4">
                <div
                  className="w-0.5 h-10 flex-shrink-0 mt-1"
                  style={{ background: mod?.stage === 'primaria' ? '#1A5C35' : '#1F2A4D' }}
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpen(res)}>
                  <div className="font-medium text-[13px] text-tinta mb-1 truncate">{res.title}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-marron-soft">{KIND_LABELS[res.kind] || res.kind}</span>
                    <span className="text-marron-soft text-[10px]">·</span>
                    <span className="font-mono text-[10px] text-marron-soft">{mod?.name || res.moduleId}</span>
                    <span className="text-marron-soft text-[10px]">·</span>
                    <span className="font-mono text-[10px] text-marron-soft">{res.teacher}</span>
                    <span className="text-marron-soft text-[10px]">·</span>
                    <span className="font-mono text-[10px] text-marron-soft">
                      {res.date ? new Date(res.date).toLocaleDateString('es') : '—'}
                    </span>
                    {res.tags.map((t) => (
                      <span key={t} className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    disabled={downloadingId === res.id}
                    onClick={() => handleDownload(res)}
                    className="font-mono text-[10px] text-marino border border-marino px-2.5 py-1 hover:bg-[rgba(31,42,77,0.05)] transition-colors disabled:opacity-50"
                  >
                    {downloadingId === res.id ? 'Generando…' : '↓ PDF'}
                  </button>
                  <button
                    disabled={deleting}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${res.title}" de la biblioteca?`)) {
                        doDelete(res);
                      }
                    }}
                    className="font-mono text-[10px] text-marron-soft border border-linea px-2.5 py-1 hover:border-granate hover:text-granate transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
