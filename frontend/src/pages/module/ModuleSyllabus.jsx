import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syllabusApi, moduleToolsApi } from '../../services/api';
import { PageHeader, SectionLabel, Badge, Modal, Button } from '../../components/ui';

const STAGE_LABEL = { primaria: 'PRIMARIA', eso: 'ESO', bachillerato: 'BACHILLERATO' };

// Cada botón de tema representa una casilla tipada. output_kind indica qué
// tipo de output_kind de tool encaja para "rellenar" ese slot al generar.
const ITEM_KINDS = [
  { kind: 'exercise',      label: 'Ejercicio',     match: ['exercise_set', 'quiz'] },
  { kind: 'presentation',  label: 'Presentación',  match: ['text'] },
  { kind: 'dynamic',       label: 'Dinámica',      match: ['text'] },
  { kind: 'exam',          label: 'Examen',        match: ['exam', 'exercise_set', 'quiz'] },
  { kind: 'documentation', label: 'Documentación', match: ['text', 'rubric', 'timeline', 'commentary'] },
];

const KIND_LABEL = Object.fromEntries(ITEM_KINDS.map((k) => [k.kind, k.label]));

// Cambridge no está en module_tool_bindings porque tiene sus propias páginas
// dedicadas. Mapeo directo kind → ruta para que el temario Cambridge lleve al
// generador correcto al pulsar sobre un slot vacío.
const CAMBRIDGE_ROUTE_BY_KIND = {
  exercise:      '/cambridge/exams/new',
  presentation:  '/cambridge/presentations',
  dynamic:       '/cambridge/dynamics',
  exam:          '/cambridge/exams/new',
  documentation: '/cambridge/exams', // sin generador dedicado — envío a listado de exámenes
};

// Vista principal del módulo — sustituye el antiguo grid de tools como
// landing. Cada tema es una tarjeta con los 5 botones de items.
export default function ModuleSyllabus() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { mod, tools, moduleId, ocrEnabled } = useOutletContext();
  // Cambridge tiene route_prefix '/eso/cambridge' en el catálogo (por
  // etapa/curso) pero sus rutas reales en la SPA viven bajo '/cambridge'.
  // Sin esta override, cualquier navigate desde el temario Cambridge caía
  // en el fallback "*" de App.jsx y sacaba al usuario al index.
  const base = moduleId === 'cambridge' ? '/cambridge' : (mod?.route_prefix || `#${moduleId}`);
  const stageLabel = STAGE_LABEL[mod?.stage] || '';

  const [newSectionTitle, setNewSectionTitle] = useState('');
  // { sectionId, kind } — abre selector de tool para rellenar el slot.
  const [pickerFor, setPickerFor] = useState(null);
  // Modal de renombrar item o sección.
  const [renaming, setRenaming] = useState(null);
  // Modal para crear item nuevo: pide título antes de POST.
  // { sectionId, kind, title } — se abre al pulsar "+ EJERCICIO/PRESENTACIÓN/…"
  const [creatingItem, setCreatingItem] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['syllabus', moduleId],
    queryFn: () => syllabusApi.get(moduleId).then((r) => r.data),
    enabled: !!moduleId,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['syllabus', moduleId] });

  const addSection    = useMutation({ mutationFn: (title) => syllabusApi.createSection(moduleId, { title }), onSuccess: invalidate });
  const patchSection  = useMutation({ mutationFn: ({ id, data }) => syllabusApi.updateSection(id, data),    onSuccess: invalidate });
  const removeSection = useMutation({ mutationFn: (id) => syllabusApi.deleteSection(id),                    onSuccess: invalidate });
  const addItem       = useMutation({ mutationFn: ({ sectionId, data }) => syllabusApi.createItem(sectionId, data), onSuccess: invalidate });
  const patchItem     = useMutation({ mutationFn: ({ id, data }) => syllabusApi.updateItem(id, data),       onSuccess: invalidate });
  const removeItem    = useMutation({ mutationFn: (id) => syllabusApi.deleteItem(id),                       onSuccess: invalidate });

  const sections = data?.sections || [];

  const handleAddSection = () => {
    const t = newSectionTitle.trim();
    if (!t) return;
    addSection.mutate(t);
    setNewSectionTitle('');
  };

  // Añadir un item — abre un pequeño modal para que el profe le ponga título.
  // Título por defecto: "Ejercicio N" (contador del kind dentro de la sección).
  const handleAddSlot = (sectionId, kind) => {
    const section = sections.find((s) => s.id === sectionId);
    const count = (section?.items || []).filter((it) => it.kind === kind).length + 1;
    const defaultTitle = `${KIND_LABEL[kind]} ${count}`;
    setCreatingItem({ sectionId, kind, title: defaultTitle });
  };

  const confirmCreateItem = () => {
    if (!creatingItem) return;
    const title = creatingItem.title.trim() || KIND_LABEL[creatingItem.kind];
    addItem.mutate(
      { sectionId: creatingItem.sectionId, data: { kind: creatingItem.kind, title } },
      { onSuccess: () => setCreatingItem(null) }
    );
  };

  const handleMoveSection = (idx, dir) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const a = sections[idx];
    const b = sections[targetIdx];
    patchSection.mutate({ id: a.id, data: { sort_order: b.sort_order } });
    patchSection.mutate({ id: b.id, data: { sort_order: a.sort_order } });
  };

  if (isLoading) {
    return (
      <div className="animate-slide-in">
        <PageHeader title={mod?.name || 'Módulo'} subtitle="CARGANDO TEMARIO…" romanNum="§ I" />
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={mod?.name || 'Módulo'}
        subtitle={`${sections.length} TEMAS · ${stageLabel} · TEMARIO DEL MÓDULO`}
        romanNum="§ I"
      />

      {/* Barra de acciones globales */}
      <div className="bg-card-bg border border-linea shadow-card p-3 mb-5 flex items-center gap-3 flex-wrap">
        <SectionLabel className="mb-0">AÑADIR TEMA</SectionLabel>
        <input
          type="text"
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
          placeholder="Título del tema (p. ej. Present Simple)"
          className="flex-1 min-w-[220px] px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
        />
        <button
          onClick={handleAddSection}
          disabled={!newSectionTitle.trim() || addSection.isPending}
          className="font-mono text-[10px] px-3 py-1.5 border border-marino bg-marino text-papel hover:bg-tinta disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Añadir tema
        </button>
        <a
          href={`${base}/herramientas`}
          className="font-mono text-[10px] text-marron-soft hover:text-tinta transition-colors ml-auto"
        >
          Ver herramientas del módulo →
        </a>
      </div>

      {sections.length === 0 && (
        <div className="bg-card-bg border border-linea shadow-card card-fold p-8 text-center">
          <div className="font-display italic text-[36px] text-[rgba(184,169,136,0.3)]">§</div>
          <p className="font-mono text-[12px] text-tinta mt-2">Tu temario está vacío.</p>
          <p className="font-mono text-[11px] text-marron-soft mt-1">
            Añade el primer tema para empezar a organizar ejercicios, presentaciones, dinámicas y exámenes.
          </p>
        </div>
      )}

      {/* Temas */}
      <div className="space-y-4">
        {sections.map((section, idx) => (
          <TemaCard
            key={section.id}
            section={section}
            index={idx}
            isFirst={idx === 0}
            isLast={idx === sections.length - 1}
            onRename={() => setRenaming({ kind: 'section', id: section.id, title: section.title })}
            onDelete={() => {
              if (confirm(`¿Eliminar el tema "${section.title}"? Se borrarán todos sus items.`)) {
                removeSection.mutate(section.id);
              }
            }}
            onMoveUp={() => handleMoveSection(idx, -1)}
            onMoveDown={() => handleMoveSection(idx, +1)}
            onAddSlot={(kind) => handleAddSlot(section.id, kind)}
            addingBusy={addItem.isPending}
            onRenameItem={(item) => setRenaming({ kind: 'item', id: item.id, title: item.title })}
            onDeleteItem={(item) => {
              if (confirm(`¿Quitar "${item.title}" del tema?`)) removeItem.mutate(item.id);
            }}
            onOpenItem={(item) => {
              // Si tiene library_item_id, va a ResourceDetail.
              if (item.library_item_id) {
                navigate(`/dashboard/resources/${item.library_item_id}`);
                return;
              }

              // Sin recurso: elige a dónde llevar al profe según el módulo.
              const kindDef = ITEM_KINDS.find((k) => k.kind === item.kind);
              const compatible = tools.filter((t) => kindDef?.match?.includes(t.output_kind));
              const q = `?syllabusItemId=${item.id}&topic=${encodeURIComponent(item.title)}`;

              // 1) Cambridge (u otros módulos con páginas dedicadas y sin tools
              // del catálogo): navegación directa a la ruta hardcodeada.
              if (moduleId === 'cambridge' && CAMBRIDGE_ROUTE_BY_KIND[item.kind]) {
                navigate(`${CAMBRIDGE_ROUTE_BY_KIND[item.kind]}${q}`);
                return;
              }

              // 2) Única tool compatible → navegación directa sin picker.
              if (compatible.length === 1) {
                navigate(`${base}/${compatible[0].key}${q}`);
                return;
              }

              // 3) Varias tools compatibles o ninguna → picker (fallback: si el
              //    filtro deja 0, el picker mostrará TODAS las tools del módulo).
              setPickerFor({ sectionId: section.id, kind: item.kind, itemId: item.id, itemTitle: item.title });
            }}
            onCorrectItem={(item) => {
              // Ancla la corrección a este item del temario: el OCR carga la
              // clave de respuestas y persiste las correcciones agrupadas por
              // syllabus_item.
              if (ocrEnabled) navigate(`${base}/ocr?syllabusItemId=${item.id}`);
            }}
            ocrEnabled={ocrEnabled}
          />
        ))}
      </div>

      {/* Modal selector de tool para rellenar un slot */}
      <Modal
        open={!!pickerFor}
        onClose={() => setPickerFor(null)}
        title={pickerFor ? `Generar ${KIND_LABEL[pickerFor.kind]}` : 'Generar'}
        footer={<Button variant="ghost" onClick={() => setPickerFor(null)}>Cancelar</Button>}
      >
        {pickerFor && (
          <ToolPicker
            pickerFor={pickerFor}
            tools={tools}
            base={base}
            ocrEnabled={ocrEnabled}
            onClose={() => setPickerFor(null)}
          />
        )}
      </Modal>

      {/* Modal de creación de item — pide título antes de POST. Feedback
          visible mientras la mutación está en curso. */}
      <Modal
        open={!!creatingItem}
        onClose={() => (addItem.isPending ? null : setCreatingItem(null))}
        title={creatingItem ? `Añadir ${KIND_LABEL[creatingItem.kind]}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreatingItem(null)} disabled={addItem.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={confirmCreateItem}
              loading={addItem.isPending}
              disabled={!creatingItem?.title?.trim()}
            >
              Crear
            </Button>
          </>
        }
      >
        {creatingItem && (
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-marron-soft block mb-1">
                TÍTULO DEL {KIND_LABEL[creatingItem.kind].toUpperCase()}
              </label>
              <input
                type="text"
                value={creatingItem.title}
                onChange={(e) => setCreatingItem((c) => ({ ...c, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && !addItem.isPending && confirmCreateItem()}
                autoFocus
                placeholder={KIND_LABEL[creatingItem.kind]}
                className="w-full px-3 py-2 bg-papel border border-linea font-mono text-[13px] text-tinta focus:outline-none focus:border-marino"
              />
            </div>
            <p className="font-mono text-[11px] text-marron-soft">
              Se creará un slot vacío. Luego pulsa sobre él para generarlo con una
              herramienta del módulo o vincularlo a un recurso de tu biblioteca.
            </p>
            {addItem.isError && (
              <div className="px-3 py-2 border border-granate/40 bg-granate/5 text-granate font-mono text-[11px]">
                Error al crear el item. Reintenta.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de renombrar */}
      <Modal
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title={renaming?.kind === 'section' ? 'Renombrar tema' : 'Renombrar item'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                const title = renaming.title.trim();
                if (!title) return;
                if (renaming.kind === 'section') {
                  patchSection.mutate({ id: renaming.id, data: { title } });
                } else {
                  patchItem.mutate({ id: renaming.id, data: { title } });
                }
                setRenaming(null);
              }}
            >
              Guardar
            </Button>
          </>
        }
      >
        {renaming && (
          <input
            type="text"
            value={renaming.title}
            onChange={(e) => setRenaming({ ...renaming, title: e.target.value })}
            className="w-full px-3 py-2 bg-papel border border-linea font-mono text-[13px] text-tinta focus:outline-none focus:border-marino"
            autoFocus
          />
        )}
      </Modal>
    </div>
  );
}

function TemaCard({
  section, index, isFirst, isLast,
  onRename, onDelete, onMoveUp, onMoveDown,
  onAddSlot, onRenameItem, onDeleteItem, onOpenItem, onCorrectItem, ocrEnabled,
  addingBusy = false,
}) {
  const items = section.items || [];

  return (
    <div className="bg-card-bg border border-linea shadow-card card-fold">
      {/* Cabecera del tema */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-linea gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display italic text-[13px] text-marron-soft flex-shrink-0">
            § {index + 1}
          </span>
          <h3 className="font-display text-[17px] font-bold text-tinta truncate" title={section.title}>
            {section.title}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onMoveUp}   disabled={isFirst} className="font-mono text-[10px] text-marron-soft hover:text-tinta disabled:opacity-30 disabled:cursor-not-allowed px-1.5">↑</button>
          <button onClick={onMoveDown} disabled={isLast}  className="font-mono text-[10px] text-marron-soft hover:text-tinta disabled:opacity-30 disabled:cursor-not-allowed px-1.5">↓</button>
          <button onClick={onRename}   className="font-mono text-[10px] text-marron-soft hover:text-tinta px-1.5">Renombrar</button>
          <button onClick={onDelete}   className="font-mono text-[10px] text-granate hover:text-tinta px-1.5">Eliminar</button>
        </div>
      </div>

      {/* Items del tema */}
      <div className="p-4 space-y-2">
        {items.length === 0 && (
          <p className="font-mono text-[11px] text-marron-soft">
            Aún no hay items en este tema. Añade uno con los botones de abajo.
          </p>
        )}
        {items.map((it) => (
          <ItemRow
            key={it.id}
            item={it}
            onOpen={() => onOpenItem(it)}
            onRename={() => onRenameItem(it)}
            onDelete={() => onDeleteItem(it)}
            onCorrect={() => onCorrectItem(it)}
            ocrEnabled={ocrEnabled}
          />
        ))}
      </div>

      {/* Botones para añadir items — los 5 tipos */}
      <div className="border-t border-linea px-4 py-3 flex flex-wrap gap-2">
        {ITEM_KINDS.map((k) => (
          <button
            key={k.kind}
            onClick={() => onAddSlot(k.kind)}
            disabled={addingBusy}
            className="font-mono text-[10px] px-2.5 py-1.5 border border-linea text-tinta hover:border-marino hover:bg-marino hover:text-papel disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            + {k.label.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function ItemRow({ item, onOpen, onRename, onDelete, onCorrect, ocrEnabled }) {
  const linked = !!item.library_item_id;
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 border ${linked ? 'border-linea bg-papel' : 'border-dashed border-linea'}`}>
      <button onClick={onOpen} className="flex items-center gap-2 flex-1 text-left min-w-0">
        <Badge variant={linked ? 'active' : 'trial'}>
          {KIND_LABEL[item.kind] || item.kind}
        </Badge>
        <span className="text-[13px] text-tinta truncate" title={item.title}>{item.title}</span>
        {!linked && (
          <span className="font-mono text-[9px] text-marron-soft flex-shrink-0">· pulsa para generar</span>
        )}
      </button>
      <div className="flex items-center gap-1 flex-shrink-0">
        {(item.kind === 'exercise' || item.kind === 'exam') && ocrEnabled && (
          <button
            onClick={onCorrect}
            className="font-mono text-[10px] px-2 py-1 border border-marino text-marino hover:bg-marino hover:text-papel transition-colors"
            title="Corregir con OCR"
          >
            Corregir
          </button>
        )}
        <button onClick={onRename} className="font-mono text-[10px] text-marron-soft hover:text-tinta px-1.5">Editar</button>
        <button onClick={onDelete} className="font-mono text-[10px] text-granate hover:text-tinta px-1.5">×</button>
      </div>
    </div>
  );
}

// Selector de tool para rellenar un slot vacío. Ordena las tools del módulo
// poniendo primero las que producen un output_kind compatible con el kind del
// item, pero NO oculta el resto: si no hay ninguna compatible, ofrece todas
// (mejor que un dead-end).
function ToolPicker({ pickerFor, tools, base, ocrEnabled, onClose }) {
  const kindDef = ITEM_KINDS.find((k) => k.kind === pickerFor.kind);

  const sorted = useMemo(() => {
    if (!kindDef) return tools;
    const isCompat = (t) => kindDef.match.includes(t.output_kind);
    return [...tools].sort((a, b) => Number(isCompat(b)) - Number(isCompat(a)));
  }, [tools, kindDef]);

  const hasCompatible = sorted.some((t) => kindDef?.match?.includes(t.output_kind));

  // Sin ninguna tool en el módulo → solo entonces damos el mensaje "sin
  // herramientas" (típico en módulos que aún no tienen catálogo de tools).
  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        <p className="font-mono text-[11px] text-marron-soft">
          Este módulo aún no tiene herramientas registradas en el catálogo.
        </p>
        <p className="font-mono text-[11px] text-marron-soft">
          Puedes vincular el item manualmente a un recurso de tu
          {' '}<a className="text-marino underline" href="/dashboard/resources">biblioteca</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
      <p className="font-mono text-[11px] text-marron-soft mb-2">
        {hasCompatible
          ? `Elige la herramienta para generar este “${KIND_LABEL[pickerFor.kind]}”:`
          : `Ninguna herramienta produce “${KIND_LABEL[pickerFor.kind]}” exactamente — puedes usar cualquiera:`}
      </p>
      {sorted.map((t) => {
        const compat = kindDef?.match?.includes(t.output_kind);
        return (
          <a
            key={t.key}
            href={`${base}/${t.key}?syllabusItemId=${pickerFor.itemId}&topic=${encodeURIComponent(pickerFor.itemTitle)}`}
            onClick={onClose}
            className={`block bg-papel border p-3 hover:border-marino transition-colors ${
              compat ? 'border-marino' : 'border-linea'
            }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-medium text-tinta">{t.name}</span>
              {compat && (
                <span className="font-mono text-[9px] text-marino border border-marino px-1.5 py-0.5">
                  RECOMENDADA
                </span>
              )}
            </div>
            <p className="text-[11px] text-marron-soft">{t.description}</p>
          </a>
        );
      })}
    </div>
  );
}
