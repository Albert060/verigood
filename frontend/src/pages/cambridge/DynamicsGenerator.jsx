import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cambridgeApi, libraryApi, syllabusApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel, Modal, Badge } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const LEVELS = ['A1','A2','B1','B2','C1','C2'].map((l) => ({ value: l, label: l }));
const DURATIONS = [{ value: 5, label: '5 min' }, { value: 10, label: '10 min' }, { value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: 'Clase entera' }];
const TYPES = [
  { value: 'speaking', label: 'Speaking' }, { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' }, { value: 'reading', label: 'Reading' },
  { value: 'writing', label: 'Writing' }, { value: 'listening', label: 'Listening' },
  { value: 'warmup', label: 'Warm-up' }, { value: 'review', label: 'Review' },
];
const RESOURCES = [
  { value: 'projector', label: 'Proyector' }, { value: 'whiteboard', label: 'Pizarra' },
  { value: 'tablets', label: 'Tablets' }, { value: 'cards', label: 'Tarjetas' },
];

const TYPE_COLORS = { speaking: '#1F2A4D', vocabulary: '#2D4A6A', grammar: '#6B1F2A', reading: '#1A5C35', writing: '#7A5A1E', listening: '#3D3D3D', warmup: '#6B1F2A', review: '#1F2A4D' };

export default function DynamicsGenerator() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ level: ['B1'], duration: [15], types: ['speaking'], resources: [] });
  const [results, setResults] = useState([]);
  // savedIds[index] = library_item_id (uuid) tras guardar; permite luego
  // vincularlo directamente al temario al pulsar play.
  const [savedIds, setSavedIds] = useState({});
  const [savingIdx, setSavingIdx] = useState(null);
  // Modal para añadir la dinámica al temario del módulo Cambridge.
  const [playFor, setPlayFor] = useState(null); // { index, dyn }
  // Desplegable "Revisar biblioteca".
  const [showLibrary, setShowLibrary] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => cambridgeApi.generateDynamics({
      level: form.level[0],
      duration: form.duration[0],
      types: form.types,
      resources: form.resources,
      count: 3,
    }),
    onSuccess: (res) => {
      setResults(res.data.dynamics || []);
      setSavedIds({});
    },
  });

  // A3 — biblioteca: dinámicas ya guardadas por el profe. Se carga on-demand.
  const { data: libraryData, isLoading: loadingLibrary } = useQuery({
    queryKey: ['library', 'dynamics', 'cambridge'],
    queryFn: () => libraryApi.list({ module: 'cambridge', kind: 'dynamic', limit: 50 }).then((r) => r.data),
    enabled: showLibrary,
    staleTime: 30_000,
  });
  const librarySaved = libraryData?.items || [];

  // Guarda una dinámica en la biblioteca. Devuelve el id para poder vincularlo
  // al temario de inmediato.
  const persistDynamic = async (dyn) => {
    const { data } = await libraryApi.create({
      moduleId: 'cambridge',
      toolKey: null,
      kind: 'dynamic',
      title: dyn.title,
      payload: dyn,
      metadata: { level: form.level[0], duration: form.duration[0], type: dyn.type },
    });
    return data.id;
  };

  const handleSave = async (index) => {
    if (savedIds[index] || savingIdx === index) return;
    setSavingIdx(index);
    try {
      const id = await persistDynamic(results[index]);
      setSavedIds((s) => ({ ...s, [index]: id }));
      qc.invalidateQueries({ queryKey: ['library'] });
    } catch (err) {
      console.error('save dynamic failed', err);
    } finally {
      setSavingIdx(null);
    }
  };

  // A2 — play: guarda la dinámica si no lo está y abre el selector de tema.
  const handlePlay = async (index) => {
    let libraryItemId = savedIds[index];
    if (!libraryItemId) {
      setSavingIdx(index);
      try {
        libraryItemId = await persistDynamic(results[index]);
        setSavedIds((s) => ({ ...s, [index]: libraryItemId }));
      } catch (err) {
        console.error(err);
        setSavingIdx(null);
        return;
      }
      setSavingIdx(null);
    }
    setPlayFor({ index, dyn: results[index], libraryItemId });
  };

  return (
    <div className="animate-slide-in">
      <PageHeader title="Dinámicas de clase" subtitle="CAMBRIDGE · 8 TIPOS DE ACTIVIDAD" romanNum="§ I.III" />

      {/* A3 — Revisar biblioteca (desplegable) */}
      <div className="bg-card-bg border border-linea shadow-card mb-5">
        <button
          onClick={() => setShowLibrary((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-papel/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <SectionLabel className="mb-0">REVISAR BIBLIOTECA</SectionLabel>
            <span className="font-mono text-[10px] text-marron-soft">
              Dinámicas guardadas para reutilizar
            </span>
          </div>
          <span className="font-mono text-[12px] text-marron-soft">{showLibrary ? '▲' : '▼'}</span>
        </button>
        {showLibrary && (
          <div className="border-t border-linea p-4">
            {loadingLibrary && (
              <p className="font-mono text-[11px] text-marron-soft">Cargando…</p>
            )}
            {!loadingLibrary && librarySaved.length === 0 && (
              <p className="font-mono text-[11px] text-marron-soft">
                Aún no has guardado dinámicas. Genera abajo y pulsa <strong>Guardar</strong> en las que quieras conservar.
              </p>
            )}
            {!loadingLibrary && librarySaved.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {librarySaved.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 border border-linea px-3 py-2 bg-papel">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-tinta truncate" title={it.title}>{it.title}</div>
                      <div className="font-mono text-[10px] text-marron-soft">
                        {it.metadata?.level || '—'} · {it.metadata?.duration || '—'} min · {it.metadata?.type || 'dynamic'}
                      </div>
                    </div>
                    <button
                      onClick={() => setPlayFor({ index: null, dyn: it.payload, libraryItemId: it.id })}
                      className="font-mono text-[10px] px-2.5 py-1 border border-marino text-marino hover:bg-marino hover:text-papel transition-colors flex items-center gap-1"
                      title="Añadir al temario"
                    >
                      ▶ Añadir al temario
                    </button>
                    <a
                      href={`/dashboard/resources/${it.id}`}
                      className="font-mono text-[10px] text-marron-soft hover:text-tinta"
                    >
                      Ver
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Config panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">NIVEL</SectionLabel>
            <TagCloud options={LEVELS} selected={form.level} onChange={(v) => setForm((f) => ({ ...f, level: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">DURACIÓN</SectionLabel>
            <TagCloud options={DURATIONS} selected={form.duration} onChange={(v) => setForm((f) => ({ ...f, duration: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TIPO DE ACTIVIDAD</SectionLabel>
            <TagCloud options={TYPES} selected={form.types} onChange={(v) => setForm((f) => ({ ...f, types: v }))} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">RECURSOS DISPONIBLES</SectionLabel>
            <TagCloud options={RESOURCES} selected={form.resources} onChange={(v) => setForm((f) => ({ ...f, resources: v }))} />
          </div>

          <Button className="w-full" loading={isPending} onClick={() => mutate()}>
            Proponer dinámicas →
          </Button>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {results.length === 0 && !isPending && (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[11px] text-marron-soft">Configura y genera para ver propuestas</p>
            </div>
          )}

          {isPending && (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Generando dinámicas...</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((dyn, i) => (
              <div key={i} className="bg-card-bg border border-linea shadow-card card-fold p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-[14px] text-tinta">{dyn.title}</span>
                      <span
                        className="font-mono text-[9px] px-1.5 py-0.5 border"
                        style={{ color: TYPE_COLORS[dyn.type] || '#B8A988', borderColor: TYPE_COLORS[dyn.type] || '#B8A988', background: `${TYPE_COLORS[dyn.type]}10` }}
                      >
                        {dyn.typeLabel || dyn.type}
                      </span>
                      <span className="font-mono text-[9px] text-marron-soft border border-linea px-1.5 py-0.5">
                        {dyn.duration} min
                      </span>
                    </div>
                    <p className="text-[12px] text-marron-soft leading-relaxed">{dyn.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleSave(i)}
                      disabled={!!savedIds[i] || savingIdx === i}
                      className={`font-mono text-[10px] px-2 py-1 border transition-colors ${
                        savedIds[i]
                          ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]'
                          : 'border-linea text-marron-soft hover:border-tinta'
                      } disabled:cursor-not-allowed`}
                    >
                      {savingIdx === i ? 'Guardando…' : savedIds[i] ? 'Guardado' : 'Guardar'}
                    </button>
                    {/* A1 — botón play en las 3 tarjetas */}
                    <button
                      onClick={() => handlePlay(i)}
                      disabled={savingIdx === i}
                      title="Añadir esta dinámica al temario"
                      className="font-mono text-[10px] px-2 py-1 border border-marino text-marino hover:bg-marino hover:text-papel disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      ▶ Play
                    </button>
                  </div>
                </div>

                {dyn.languageFocus?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dyn.languageFocus.map((f) => (
                      <span key={f} className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">{f}</span>
                    ))}
                  </div>
                )}

                {dyn.instructions?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(184,169,136,0.3)]">
                    <div className="font-mono text-[10px] text-marron-soft mb-1.5">INSTRUCCIONES</div>
                    <ol className="space-y-0.5">
                      {dyn.instructions.map((inst, j) => (
                        <li key={j} className="text-[11px] text-marron-soft flex gap-2">
                          <span className="font-mono text-[10px] text-marron-soft w-4 flex-shrink-0">{j + 1}.</span>
                          {inst}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <DownloadPdfButton
                type="dynamics"
                data={{ dynamics: results }}
                title={`Dinámicas Cambridge ${form.level[0]}`}
                subtitle={`${results.length} actividades · ${form.duration[0]} min`}
                moduleKey="cambridge"
                filename={`dinamicas-cambridge-${form.level[0]}-${Date.now()}`}
              />
              <Button variant="ghost" onClick={() => mutate()}>Regenerar propuestas</Button>
            </div>
          )}
        </div>
      </div>

      {/* A2 — Modal: elegir tema del temario al que añadir la dinámica */}
      <AddToSyllabusModal
        open={!!playFor}
        onClose={() => setPlayFor(null)}
        payload={playFor}
      />
    </div>
  );
}

// Selector de tema del temario Cambridge para insertar la dinámica.
// Consume el mismo endpoint que ModuleSyllabus (auto-crea el temario si no
// existía) y hace POST /api/syllabus/sections/:id/items con kind='dynamic'.
function AddToSyllabusModal({ open, onClose, payload }) {
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['syllabus', 'cambridge'],
    queryFn: () => syllabusApi.get('cambridge').then((r) => r.data),
    enabled: open,
    staleTime: 30_000,
  });

  const sections = data?.sections || [];

  const addItem = useMutation({
    mutationFn: ({ sectionId, title, libraryItemId }) => syllabusApi.createItem(sectionId, {
      kind: 'dynamic',
      title,
      library_item_id: libraryItemId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['syllabus'] });
      onClose();
    },
  });

  const createSection = useMutation({
    mutationFn: (title) => syllabusApi.createSection('cambridge', { title }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['syllabus', 'cambridge'] });
      setSelectedSection(res.data.section.id);
    },
  });

  const handleAdd = () => {
    if (!selectedSection || !payload) return;
    addItem.mutate({
      sectionId: selectedSection,
      title: payload.dyn.title,
      libraryItemId: payload.libraryItemId,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Añadir dinámica al temario"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAdd} loading={addItem.isPending} disabled={!selectedSection}>
            Añadir al tema
          </Button>
        </>
      }
    >
      {isLoading && (
        <p className="font-mono text-[12px] text-marron-soft">Cargando temario…</p>
      )}
      {!isLoading && payload && (
        <div className="space-y-4">
          <div className="p-3 border border-linea bg-papel">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="trial">DINÁMICA</Badge>
              <span className="text-[13px] font-medium text-tinta truncate">{payload.dyn.title}</span>
            </div>
            <p className="text-[11px] text-marron-soft">Se añadirá al temario del módulo <strong>Cambridge</strong>.</p>
          </div>

          <div>
            <SectionLabel className="mb-2">TEMA DE DESTINO</SectionLabel>
            {sections.length === 0 ? (
              <div className="space-y-2">
                <p className="font-mono text-[11px] text-marron-soft">
                  Tu temario Cambridge está vacío. Crea el primer tema:
                </p>
                <NewSectionInline onCreate={(t) => createSection.mutate(t)} loading={createSection.isPending} />
              </div>
            ) : (
              <>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
                >
                  <option value="">Selecciona un tema…</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                <div className="mt-3">
                  <NewSectionInline onCreate={(t) => createSection.mutate(t)} loading={createSection.isPending} label="…o crea uno nuevo" />
                </div>
              </>
            )}
          </div>

          {addItem.isError && (
            <div className="px-3 py-2 border border-granate/40 bg-granate/5 text-granate font-mono text-[11px]">
              Error al añadir al temario. Reintenta.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function NewSectionInline({ onCreate, loading, label = 'Crear nuevo tema' }) {
  const [title, setTitle] = useState('');
  return (
    <div>
      <label className="font-mono text-[10px] text-marron-soft block mb-1">{label.toUpperCase()}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del tema"
          className="flex-1 px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
        />
        <button
          onClick={() => { if (title.trim()) { onCreate(title.trim()); setTitle(''); } }}
          disabled={loading || !title.trim()}
          className="font-mono text-[10px] px-3 py-1.5 border border-marino bg-marino text-papel hover:bg-tinta disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Crear
        </button>
      </div>
    </div>
  );
}
