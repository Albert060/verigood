import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useSearchParams, Link } from 'react-router-dom';
import { moduleOcrApi, syllabusApi, libraryApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel, ProgressBar, Card, Badge } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

// Corrector OCR genérico. Dos modos:
//  - Suelto (sin ?syllabusItemId): igual que antes — sube foto y corrige.
//  - Anclado al temario (?syllabusItemId=X): panel izquierdo con la clave de
//    respuestas de referencia editable (B2). Cuando el profe valida la clave
//    (B3), las fotos siguientes se corrigen usando esa clave como criterio,
//    marcando en rojo lo que la IA considere incorrecto (B4). Cada foto se
//    persiste con el nombre del alumno; abajo aparece la lista de alumnos
//    corregidos con nota y botón "Ver documento" (B6, B7).
export default function ModuleOcrPage() {
  const { moduleId, mod } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const syllabusItemId = searchParams.get('syllabusItemId');
  const qc = useQueryClient();

  // Carga del temario del módulo — sirve para el selector Tema/Ejercicio al
  // entrar en el corrector sin haber pulsado "Corregir" desde el temario.
  const { data: syllabusData } = useQuery({
    queryKey: ['syllabus', moduleId],
    queryFn: () => syllabusApi.get(moduleId).then((r) => r.data),
    enabled: !!moduleId,
    staleTime: 60_000,
  });

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ course: '', focus: '', feedbackMode: 'full' });
  const [studentName, setStudentName] = useState('');
  const [result, setResult] = useState(null);
  const [finalScoreOverride, setFinalScoreOverride] = useState('');
  const fileRef = useRef();

  const { data: cfg, isLoading: loadingCfg } = useQuery({
    queryKey: ['module-ocr-config', moduleId],
    queryFn: () => moduleOcrApi.getConfig(moduleId).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  // Modo temario: cargar item + su clave de respuestas de referencia.
  const { data: itemData } = useQuery({
    queryKey: ['syllabus-item', syllabusItemId],
    queryFn: () => syllabusApi.getItem(syllabusItemId).then((r) => r.data),
    enabled: !!syllabusItemId,
    staleTime: 30_000,
  });
  const item = itemData?.item || null;

  // Estado editable del panel izquierdo. Se hidrata desde metadata.answer_key
  // del item, o desde el payload del library_item enlazado si existe.
  const [answerKey, setAnswerKey] = useState('');
  const [answerKeyDirty, setAnswerKeyDirty] = useState(false);
  useEffect(() => {
    if (!item) return;
    const fromMetadata = item.metadata?.answer_key;
    const fromLibrary  = item.library_payload
      ? seedAnswerKeyFromPayload(item.library_payload)
      : '';
    setAnswerKey(fromMetadata || fromLibrary || '');
    setAnswerKeyDirty(false);

    // Autoprecarga del curso desde el payload/metadata del library_item.
    // Los seeds guardan level/course en varias ubicaciones típicas, así que
    // buscamos por prioridad razonable y solo autocompletamos si el profe no
    // ha tocado el selector aún.
    const guessed =
      item.library_payload?.course ||
      item.library_payload?.level ||
      item.metadata?.course ||
      item.metadata?.level;
    if (guessed && !form.course) {
      setForm((f) => ({ ...f, course: guessed }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const saveAnswerKey = useMutation({
    mutationFn: () => syllabusApi.updateItem(syllabusItemId, {
      metadata: { ...(item?.metadata || {}), answer_key: answerKey.trim() },
    }),
    onSuccess: () => {
      setAnswerKeyDirty(false);
      qc.invalidateQueries({ queryKey: ['syllabus-item', syllabusItemId] });
      qc.invalidateQueries({ queryKey: ['syllabus'] });
    },
  });

  // Lista de correcciones ya hechas para este ejercicio (B6).
  const { data: correctionsData } = useQuery({
    queryKey: ['syllabus-item-corrections', syllabusItemId],
    queryFn: () => syllabusApi.listCorrections(syllabusItemId).then((r) => r.data),
    enabled: !!syllabusItemId,
    staleTime: 30_000,
  });
  const corrections = correctionsData?.corrections || [];

  const { mutate, isPending } = useMutation({
    // Acepta el archivo por argumento para que la auto-corrección (llamada
    // desde handleFile inmediatamente tras setFile) no lea state stale.
    mutationFn: (fileArg) => {
      const uploadFile = fileArg || file;
      const fd = new FormData();
      fd.append('examImage', uploadFile);
      if (form.course) fd.append('course', form.course);
      if (form.focus)  fd.append('focus', form.focus);
      fd.append('feedbackMode', form.feedbackMode);
      if (syllabusItemId) fd.append('syllabusItemId', syllabusItemId);
      if (studentName)    fd.append('studentName', studentName);
      // Si hay clave de referencia validada, la mandamos al backend para que
      // Claude califique contra ella. B3.
      const savedKey = item?.metadata?.answer_key;
      if (savedKey) fd.append('referenceAnswerKey', savedKey);
      return moduleOcrApi.correct(moduleId, fd);
    },
    onSuccess: (res) => {
      setResult(res.data);
      setFinalScoreOverride(String(res.data.totalScore ?? ''));
      qc.invalidateQueries({ queryKey: ['syllabus-item-corrections', syllabusItemId] });
    },
  });

  // B5 — Visto bueno del profe: PATCH library_items.metadata con finalScore y
  // approvedAt. Al invalidar la lista, la fila aparece con badge "REVISADO"
  // y la nota final ajustada.
  const approve = useMutation({
    mutationFn: () => {
      const libraryItemId = result?.libraryItemId;
      if (!libraryItemId) throw new Error('No library item');
      return libraryApi.update(libraryItemId, {
        finalScore: Number(finalScoreOverride),
        approvedAt: new Date().toISOString(),
      });
    },
    onSuccess: (res) => {
      setResult((r) => ({
        ...r,
        approvedAt: res.data?.metadata?.approvedAt || new Date().toISOString(),
        finalScore: Number(finalScoreOverride),
      }));
      qc.invalidateQueries({ queryKey: ['syllabus-item-corrections', syllabusItemId] });
    },
  });

  // Al subir/seleccionar la foto: guarda el archivo y, si en modo temario ya
  // hay clave validada + nombre de alumno + curso, dispara la corrección
  // automáticamente (sin clic extra). El profe solo pone foco/archivo y sale
  // el resultado. En modo suelto (sin syllabusItemId) no auto-fire: allí el
  // profe sigue rellenando parámetros abajo antes de "Corregir prueba".
  const handleFile = (f) => {
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    const referenceOK = syllabusItemId && !!item?.metadata?.answer_key && !answerKeyDirty;
    if (referenceOK && studentName.trim() && form.course && !isPending) {
      // Pasamos el archivo por argumento — evita leer state stale de `file`.
      mutate(f);
    }
  };

  const resetForNext = () => {
    setResult(null);
    setFile(null);
    setPreview(null);
    setStudentName('');
    setFinalScoreOverride('');
  };

  if (loadingCfg) {
    return <div className="font-mono text-[11px] text-marron-soft">Cargando corrector…</div>;
  }
  if (!cfg?.enabled) {
    // Antes hacíamos <Navigate> silencioso — daba un flash al usuario y no
    // había pista de qué pasaba. Ahora explicamos: si el módulo NO está en
    // OCR_CONFIG del backend (ocrSubjects.js), invitamos a reiniciar; si es
    // que el módulo genuinamente no tiene OCR, ofrecemos volver al módulo.
    return (
      <div className="animate-slide-in">
        <PageHeader
          title="Corregir ejercicio"
          subtitle={`${(mod?.name || '').toUpperCase()} · OCR NO DISPONIBLE`}
          romanNum="§ I.II"
        />
        <div className="bg-[rgba(232,216,154,0.15)] border border-amarillo p-4">
          <p className="font-mono text-[12px] text-[#7A5A1E]">
            El corrector OCR aún no está configurado para este módulo.
            Si lo acabas de habilitar en <code>backend/src/services/ocrSubjects.js</code>,
            reinicia el backend (<code>npm run dev:backend</code>) y recarga esta página.
          </p>
          <div className="mt-3">
            <Link to={mod?.route_prefix || '/dashboard'} className="font-mono text-[11px] text-marino hover:text-granate transition-colors">
              ← Volver al módulo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pct = result ? Math.round((result.totalScore / result.maxScore) * 100) : 0;
  const isSyllabusMode = !!syllabusItemId;
  const referenceReady = isSyllabusMode && !!item?.metadata?.answer_key && !answerKeyDirty;

  const syllabusSections = syllabusData?.sections || [];

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Corregir ejercicio"
        subtitle={
          isSyllabusMode && item
            ? `${item.title.toUpperCase()} · TEMARIO · ${cfg.label.toUpperCase()}`
            : `${cfg.label.toUpperCase()} · SUBE UNA FOTO · CORRECCIÓN AUTOMÁTICA`
        }
        romanNum="§ I.II"
      />

      {/* Selector de tema/ejercicio del temario — permite corregir organizando
          por los mismos temas que ya creó el profe. Al elegir un ejercicio, se
          actualiza la URL con syllabusItemId=X y se recarga todo el modo
          temario (clave de referencia, lista de alumnos, etc.). */}
      <TemaSelector
        sections={syllabusSections}
        currentItemId={syllabusItemId}
        currentItem={item}
        onPick={(itemId) => {
          if (!itemId) {
            const p = new URLSearchParams(searchParams);
            p.delete('syllabusItemId');
            setSearchParams(p);
            return;
          }
          const p = new URLSearchParams(searchParams);
          p.set('syllabusItemId', itemId);
          setSearchParams(p);
          setResult(null);
          setFile(null);
          setPreview(null);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Panel izquierdo ─────────────────────────────────────
             Modo temario  → clave de respuestas editable + validar (B2, B3).
             Modo suelto   → panel de configuración clásico. */}
        <div>
          {isSyllabusMode ? (
            <ReferenceKeyPanel
              item={item}
              answerKey={answerKey}
              dirty={answerKeyDirty}
              onChange={(v) => { setAnswerKey(v); setAnswerKeyDirty(true); }}
              onSave={() => saveAnswerKey.mutate()}
              saving={saveAnswerKey.isPending}
              ready={referenceReady}
            />
          ) : (
            <StandaloneConfigPanel
              cfg={cfg}
              form={form}
              setForm={setForm}
              file={file}
              preview={preview}
              handleFile={handleFile}
              fileRef={fileRef}
              onCorrect={() => mutate()}
              isPending={isPending}
            />
          )}
        </div>

        {/* ── Panel derecho ──────────────────────────────────────
             Modo temario  → sección de subir foto de un alumno (activo solo
                             cuando la clave de referencia está validada) +
                             resultado.
             Modo suelto   → resultado de la única foto. */}
        <div>
          {isSyllabusMode && (
            <PhotoUploadForStudent
              cfg={cfg}
              form={form}
              setForm={setForm}
              file={file}
              preview={preview}
              handleFile={handleFile}
              fileRef={fileRef}
              studentName={studentName}
              setStudentName={setStudentName}
              onCorrect={() => mutate()}
              isPending={isPending}
              disabled={!referenceReady}
              answerKeyDirty={answerKeyDirty}
            />
          )}

          {isPending && (
            <div className="h-40 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-marino border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Procesando OCR y corrigiendo...</p>
            </div>
          )}

          {result && !isPending && (
            <ResultView
              result={result}
              cfg={cfg}
              moduleId={moduleId}
              studentName={studentName}
              finalScoreOverride={finalScoreOverride}
              setFinalScoreOverride={setFinalScoreOverride}
              approve={approve}
              isSyllabusMode={isSyllabusMode}
              onNext={resetForNext}
            />
          )}

          {!result && !isPending && !isSyllabusMode && (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[36px] text-[rgba(184,169,136,0.3)] mb-2">§ II</div>
                <p className="font-mono text-[11px] text-marron-soft">El resultado aparecerá aquí</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* B6 — Lista de alumnos corregidos + B7 Ver documento */}
      {isSyllabusMode && corrections.length > 0 && (
        <StudentsList corrections={corrections} />
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

// Deriva un borrador de referencia a partir del payload del library item
// enlazado. Cubre todos los output_kind que produce el sistema para que la
// textarea nunca aparezca vacía cuando hay un recurso ya generado:
//   · exercise_set / quiz / exam → preguntas con "→ respuesta"
//   · presentation (slides)     → título y bullets por slide
//   · dynamic                    → título + instrucciones numeradas
//   · rubric                     → criterios y descripción
//   · timeline                   → hitos ordenados
//   · commentary                 → texto plano
//   · text / documentation      → texto plano (o markdown tal cual)
//   · fallback                  → JSON pretty (para que el profe edite algo)
function seedAnswerKeyFromPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;

  // Ejercicios / exámenes / cuestionarios con lista de preguntas.
  const list = payload.exercises || payload.questions;
  if (Array.isArray(list) && list.length > 0) {
    return list.map((q, i) => {
      const n = q.number || (i + 1);
      const prompt = q.question || q.prompt || q.title || `Pregunta ${n}`;
      const answer = q.answer || q.correctAnswer || '';
      return `${n}. ${prompt}\n   → ${answer}`;
    }).join('\n\n');
  }

  // Presentaciones: slides con título y bullets.
  if (Array.isArray(payload.slides) && payload.slides.length > 0) {
    return payload.slides.map((s, i) => {
      const title = s.title || `Slide ${i + 1}`;
      const bullets = Array.isArray(s.bullets) ? s.bullets.map((b) => `   · ${b}`).join('\n') : '';
      return `${i + 1}. ${title}${bullets ? '\n' + bullets : ''}`;
    }).join('\n\n');
  }

  // Dinámicas: título, descripción e instrucciones numeradas.
  if (Array.isArray(payload.instructions) && payload.instructions.length > 0) {
    const header = payload.title || 'Dinámica';
    const desc = payload.description ? `\n${payload.description}\n` : '';
    const inst = payload.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return `${header}${desc}\nInstrucciones:\n${inst}`;
  }

  // Rúbricas: criterios y descripción.
  if (Array.isArray(payload.criteria) && payload.criteria.length > 0) {
    return payload.criteria.map((c, i) => {
      const name = c.name || c.title || `Criterio ${i + 1}`;
      const desc = c.description || c.desc || '';
      return `${i + 1}. ${name}${desc ? `\n   ${desc}` : ''}`;
    }).join('\n\n');
  }

  // Timelines: eventos con año y descripción.
  if (Array.isArray(payload.events) && payload.events.length > 0) {
    return payload.events.map((e, i) => {
      const when = e.year || e.date || (i + 1);
      const title = e.title || e.name || '';
      const desc = e.description || e.desc || '';
      return `${when}. ${title}${desc ? ` — ${desc}` : ''}`;
    }).join('\n');
  }

  // Texto / documentación / comentario / markdown.
  if (typeof payload.text === 'string' && payload.text.trim())      return payload.text;
  if (typeof payload.content === 'string' && payload.content.trim()) return payload.content;
  if (typeof payload.markdown === 'string' && payload.markdown.trim()) return payload.markdown;
  if (typeof payload.summary === 'string' && payload.summary.trim())  return payload.summary;

  // Último recurso: volcado JSON legible. El profe puede reescribirlo a mano.
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return '';
  }
}

// ── Subcomponentes ──────────────────────────────────────────────

// Selector Tema → Ejercicio del temario. Permite al profe entrar en el
// corrector sin haber pulsado "Corregir" desde el temario y aún así organizar
// sus correcciones por los mismos temas y ejercicios que ya tiene creados.
// Filtra items por kind ∈ {exercise, exam} (los que tiene sentido corregir).
function TemaSelector({ sections, currentItemId, currentItem, onPick }) {
  const CORRECTABLE_KINDS = ['exercise', 'exam'];

  // Sección actual derivada del item elegido.
  const currentSectionId =
    currentItem?.section_id ??
    sections.find((s) => (s.items || []).some((it) => it.id === currentItemId))?.id ??
    '';

  const [tema, setTema] = useState(currentSectionId);
  useEffect(() => { setTema(currentSectionId); }, [currentSectionId]);

  const sectionItems = (sections.find((s) => s.id === tema)?.items || [])
    .filter((it) => CORRECTABLE_KINDS.includes(it.kind));

  const totalCorrectable = sections.reduce(
    (s, sec) => s + (sec.items || []).filter((it) => CORRECTABLE_KINDS.includes(it.kind)).length,
    0
  );

  if (sections.length === 0) return null;

  return (
    <div className="bg-card-bg border border-linea shadow-card p-3 mb-5 flex items-center gap-3 flex-wrap">
      <SectionLabel className="mb-0">CORREGIR POR TEMA</SectionLabel>

      <select
        value={tema}
        onChange={(e) => { setTema(e.target.value); onPick(null); }}
        className="px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino"
      >
        <option value="">Elige un tema…</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>

      <select
        value={currentItemId || ''}
        onChange={(e) => onPick(e.target.value || null)}
        disabled={!tema}
        className="flex-1 min-w-[200px] px-3 py-1.5 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {!tema
            ? 'Elige primero un tema'
            : sectionItems.length === 0
              ? 'Este tema no tiene ejercicios ni exámenes'
              : 'Elige un ejercicio o examen…'}
        </option>
        {sectionItems.map((it) => (
          <option key={it.id} value={it.id}>
            {it.kind === 'exam' ? '📝 ' : '✎ '}{it.title}
          </option>
        ))}
      </select>

      {currentItemId && (
        <button
          onClick={() => onPick(null)}
          className="font-mono text-[10px] text-marron-soft hover:text-tinta transition-colors"
          title="Salir del modo temario"
        >
          Quitar
        </button>
      )}

      <span className="font-mono text-[10px] text-marron-soft ml-auto">
        {totalCorrectable} ejercicios en el temario
      </span>
    </div>
  );
}

function ReferenceKeyPanel({ item, answerKey, dirty, onChange, onSave, saving, ready }) {
  // Etiquetas dinámicas según el kind del item — así el panel no dice
  // "EJERCICIO" cuando estás corrigiendo una dinámica o una presentación.
  const KIND_LABEL = {
    exercise: 'EJERCICIO', exam: 'EXAMEN', dynamic: 'DINÁMICA',
    presentation: 'PRESENTACIÓN', documentation: 'DOCUMENTACIÓN',
  };
  const kindLabel = KIND_LABEL[item?.kind] || 'ACTIVIDAD';
  const kindLower = kindLabel.toLowerCase();

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <SectionLabel className="mb-0">CORRECCIÓN DE REFERENCIA</SectionLabel>
        {ready
          ? <Badge variant="active">VALIDADA</Badge>
          : <Badge variant="trial">PENDIENTE</Badge>
        }
      </div>

      {!item && (
        <div className="font-mono text-[11px] text-marron-soft">Cargando actividad del temario…</div>
      )}

      {item && (
        <>
          <div className="mb-3 border border-linea bg-card-bg p-3">
            <div className="font-mono text-[10px] text-marron-soft mb-1">{kindLabel}</div>
            <div className="text-[13px] text-tinta font-medium">{item.title}</div>
            {item.library_item_id ? (
              <Link
                to={`/dashboard/resources/${item.library_item_id}`}
                className="font-mono text-[10px] text-marino hover:text-granate transition-colors"
              >
                Ver {kindLower} original →
              </Link>
            ) : (
              <div className="font-mono text-[10px] text-marron-soft">
                Sin recurso original enlazado. Escribe la referencia manualmente.
              </div>
            )}
          </div>

          <label className="font-mono text-[10px] text-marron-soft block mb-1">
            CLAVE DE RESPUESTAS EDITABLE
          </label>
          <textarea
            value={answerKey}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              '1. Enunciado…\n   → Respuesta correcta\n\n2. Enunciado…\n   → Respuesta correcta'
            }
            rows={16}
            className="w-full px-3 py-2 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino resize-y"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              onClick={onSave}
              loading={saving}
              disabled={!dirty}
              variant={ready ? 'ghost' : 'primary'}
            >
              {ready ? 'Guardar cambios' : 'Validar corrección de referencia'}
            </Button>
            {ready && !dirty && (
              <span className="font-mono text-[10px] text-marron-soft">
                Las próximas fotos se corregirán contra esta clave.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StandaloneConfigPanel({ cfg, form, setForm, file, preview, handleFile, fileRef, onCorrect, isPending }) {
  return (
    <div>
      {!file ? (
        <div
          className="upload-zone mb-4"
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        >
          <div className="text-2xl text-marron-soft mb-2">◉</div>
          <div className="uz-title">Haz una foto o sube la imagen</div>
          <div className="uz-sub">JPG, PNG, WebP o PDF · máx. 10 MB</div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="border border-linea mb-4 relative">
          <img src={preview} alt="preview" className="w-full max-h-48 object-cover" />
          <button
            onClick={() => { handleFile(null); }}
            className="absolute top-2 right-2 bg-papel border border-linea px-2 py-0.5 font-mono text-[10px] text-marron-soft hover:text-granate"
          >
            Cambiar
          </button>
        </div>
      )}

      <ConfigFields cfg={cfg} form={form} setForm={setForm} />

      <Button
        className="w-full mt-4"
        loading={isPending}
        disabled={!file || !form.course}
        onClick={onCorrect}
      >
        Corregir prueba →
      </Button>
    </div>
  );
}

function PhotoUploadForStudent({
  cfg, form, setForm, file, preview, handleFile, fileRef,
  studentName, setStudentName, onCorrect, isPending, disabled, answerKeyDirty,
}) {
  // El upload zone queda deshabilitado hasta que el profe haya escrito el
  // nombre del alumno y elegido curso — así el auto-fire al subir siempre
  // tiene todo lo que necesita.
  const readyToShoot = !disabled && studentName.trim() && form.course && !isPending;

  return (
    <div className="mb-5">
      <SectionLabel className="mb-2">CORREGIR EXAMEN DEL ALUMNO</SectionLabel>

      {disabled && (
        <div className="mb-3 px-3 py-2 border border-amarillo bg-[rgba(232,216,154,0.15)] font-mono text-[11px] text-[#7A5A1E]">
          {answerKeyDirty
            ? 'Guarda los cambios de la clave de referencia antes de corregir alumnos.'
            : 'Valida primero la corrección de referencia a la izquierda.'}
        </div>
      )}

      <label className="font-mono text-[10px] text-marron-soft block mb-1">NOMBRE DEL ALUMNO</label>
      <input
        type="text"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        placeholder="Ana García"
        disabled={disabled}
        className="w-full px-3 py-1.5 mb-3 bg-papel border border-linea font-mono text-[12px] text-tinta focus:outline-none focus:border-marino disabled:opacity-50"
      />

      <ConfigFields cfg={cfg} form={form} setForm={setForm} disabled={disabled} compact />

      <div className="mt-3">
        {!file ? (
          <div
            className="upload-zone mb-2"
            onClick={() => readyToShoot && fileRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { if (!readyToShoot) return; e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            style={!readyToShoot ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            <div className="text-xl text-marron-soft mb-1">◉</div>
            <div className="uz-title">Sube la foto del examen</div>
            <div className="uz-sub">
              {readyToShoot
                ? 'Se corregirá automáticamente al subirla'
                : 'Escribe primero el nombre del alumno y el curso'}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="border border-linea mb-2 relative">
            <img src={preview} alt="preview" className="w-full max-h-40 object-cover" />
            <button
              onClick={() => { handleFile(null); }}
              className="absolute top-2 right-2 bg-papel border border-linea px-2 py-0.5 font-mono text-[10px] text-marron-soft hover:text-granate"
            >
              Cambiar
            </button>
            {isPending && (
              <div className="absolute inset-0 bg-papel/70 flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-marino border-t-transparent rounded-full animate-spin" />
                <span className="font-mono text-[11px] text-tinta">Corrigiendo…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* El botón queda como fallback manual (por si el auto-fire no saltó,
          p. ej. el profe cambió parámetros después de subir la foto). */}
      {file && !isPending && (
        <Button
          className="w-full mt-1"
          disabled={disabled || !form.course || !studentName.trim()}
          onClick={onCorrect}
        >
          Volver a corregir con estos parámetros →
        </Button>
      )}
    </div>
  );
}

function ConfigFields({ cfg, form, setForm, disabled = false, compact = false }) {
  return (
    <>
      <div className={compact ? 'mb-2' : 'mb-4'}>
        <SectionLabel className="mb-2">{(cfg.levelLabel || 'CURSO').toUpperCase()}</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {(cfg.levels || []).map((c) => (
            <button
              key={c}
              onClick={() => setForm((f) => ({ ...f, course: c }))}
              disabled={disabled}
              className={`py-1.5 border font-mono text-[11px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                form.course === c ? 'bg-marino text-papel border-marino' : 'border-linea text-marron-soft hover:border-tinta bg-card-bg'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {(cfg.focusOptions || []).length > 0 && !compact && (
        <div className="mb-4">
          <SectionLabel className="mb-2">FOCO DE CORRECCIÓN</SectionLabel>
          <TagCloud
            options={(cfg.focusOptions || []).map((o) => ({ value: o, label: o }))}
            selected={form.focus ? [form.focus] : []}
            onChange={([v]) => setForm((f) => ({ ...f, focus: v || '' }))}
            multi={false}
          />
        </div>
      )}

      {!compact && (
        <div className="mb-2">
          <SectionLabel className="mb-2">NIVEL DE FEEDBACK</SectionLabel>
          <TagCloud
            options={cfg.feedbackModes}
            selected={[form.feedbackMode]}
            onChange={([v]) => setForm((f) => ({ ...f, feedbackMode: v }))}
            multi={false}
          />
        </div>
      )}
    </>
  );
}

function ResultView({
  result, cfg, moduleId, studentName,
  finalScoreOverride, setFinalScoreOverride, approve,
  isSyllabusMode, onNext,
}) {
  const pct = Math.round((result.totalScore / result.maxScore) * 100);

  // B4 — heurística para detectar preguntas "de desarrollo" (no de opción
  // corta). Marcamos con badge rojo cuando la IA las considera incorrectas.
  const isOpenEnded = (q) => {
    const ans = String(q.studentAnswer || '');
    const ref = String(q.correctAnswer || '');
    return ans.length > 40 || ref.length > 40 || q.type === 'essay' || q.type === 'open';
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 flex items-start justify-between">
        <div>
          <SectionLabel className="mb-1">
            {studentName || result.subjectLabel || cfg.label} · {result.course || ''}
          </SectionLabel>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[32px] text-tinta">{result.totalScore}</span>
            <span className="font-mono text-[14px] text-marron-soft">/ {result.maxScore}</span>
          </div>
          <ProgressBar value={result.totalScore} max={result.maxScore} className="w-32 mt-1" />
        </div>
        <div className="score-stamp text-[22px]">
          {result.grade || (pct >= 50 ? 'APTO' : 'NO APTO')}
        </div>
      </Card>

      {(result.questions || []).length > 0 && (
        <Card className="p-4">
          <SectionLabel className="mb-2">RESPUESTAS</SectionLabel>
          <div className="space-y-1.5">
            {(result.questions || []).map((q) => {
              const openEnded = isOpenEnded(q);
              const wrongOpen = openEnded && !q.isCorrect;
              return (
                <div
                  key={q.number}
                  className={`flex items-center gap-2 text-[12px] px-2 py-1 border ${
                    wrongOpen
                      ? 'border-granate bg-[rgba(107,31,42,0.06)]'
                      : 'border-transparent'
                  }`}
                >
                  <span className={`w-5 h-5 border flex items-center justify-center font-mono text-[10px] flex-shrink-0 ${
                    q.isCorrect
                      ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]'
                      : 'bg-[#FCF0F0] text-granate border-[#D4878A]'
                  }`}>{q.number}</span>
                  <span className={`flex-1 truncate ${wrongOpen ? 'text-granate font-medium' : 'text-tinta'}`}>
                    {q.question || `Pregunta ${q.number}`}
                  </span>
                  {openEnded && (
                    <Badge variant={wrongOpen ? 'paused' : 'trial'}>DESARROLLO</Badge>
                  )}
                  <span className="font-mono text-[11px] text-marron-soft truncate max-w-[120px]">{q.studentAnswer}</span>
                  {!q.isCorrect && q.correctAnswer && (
                    <span className="font-caveat text-[13px] text-granate truncate max-w-[140px]">→ {q.correctAnswer}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {result.overallFeedback && (
        <Card className="p-4">
          <SectionLabel className="mb-2">FEEDBACK GLOBAL</SectionLabel>
          <p className="text-[12px] text-tinta/90 leading-relaxed">{result.overallFeedback}</p>
        </Card>
      )}

      {/* B5 — Visto bueno + puntuación final del profe */}
      <Card className="p-4">
        <SectionLabel className="mb-2">PUNTUACIÓN FINAL DEL PROFESOR</SectionLabel>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={finalScoreOverride}
              onChange={(e) => setFinalScoreOverride(e.target.value)}
              min={0}
              max={result.maxScore}
              step="0.25"
              className="w-20 px-3 py-1.5 bg-papel border border-linea font-mono text-[13px] text-tinta focus:outline-none focus:border-marino"
            />
            <span className="font-mono text-[12px] text-marron-soft">/ {result.maxScore}</span>
          </div>
          <Button onClick={() => approve.mutate()} loading={approve.isPending} disabled={result.approvedAt}>
            {result.approvedAt ? '✓ Visto bueno dado' : 'Dar visto bueno'}
          </Button>
          <span className="font-mono text-[10px] text-marron-soft">
            Ajusta la nota si el criterio de la IA no encaja con el tuyo.
          </span>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <DownloadPdfButton
          type="ocr"
          data={result}
          title={`Corrección ${cfg.label} ${studentName || ''}`.trim()}
          subtitle={`Puntuación ${result.totalScore}/${result.maxScore}`}
          moduleKey={moduleId}
          filename={`correccion-${moduleId}-${(studentName || 'alumno').replace(/\s+/g, '_')}-${Date.now()}`}
        />
        {isSyllabusMode && (
          <Button variant="ghost" onClick={onNext}>Siguiente alumno →</Button>
        )}
        {!isSyllabusMode && (
          <Button variant="ghost" onClick={onNext}>Nueva corrección</Button>
        )}
      </div>
    </div>
  );
}

function StudentsList({ corrections }) {
  const avgScore = useMemo(() => {
    const with_scores = corrections.filter((c) => c.totalScore != null);
    if (with_scores.length === 0) return null;
    const sum = with_scores.reduce((a, c) => a + (c.finalScore ?? c.totalScore), 0);
    return Math.round((sum / with_scores.length) * 10) / 10;
  }, [corrections]);

  return (
    <div className="mt-6 bg-card-bg border border-linea shadow-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-linea">
        <SectionLabel className="mb-0">
          ALUMNOS CORREGIDOS — {corrections.length}
        </SectionLabel>
        {avgScore != null && (
          <span className="font-mono text-[11px] text-marron-soft">
            Nota media: <span className="font-bold text-tinta">{avgScore}</span>
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="vg-table">
          <thead>
            <tr>
              <th>ALUMNO</th><th>NOTA IA</th><th>NOTA FINAL</th><th>ESTADO</th>
              <th>CORREGIDO</th><th></th>
            </tr>
          </thead>
          <tbody>
            {corrections.map((c) => {
              const finalScore = c.finalScore ?? c.totalScore;
              return (
                <tr key={c.id}>
                  <td className="font-medium text-tinta">{c.studentName || '—'}</td>
                  <td className="font-mono text-[12px] text-marron-soft">
                    {c.totalScore != null ? `${c.totalScore}/${c.maxScore}` : '—'}
                  </td>
                  <td className="font-mono text-[13px] text-tinta">
                    {finalScore != null ? `${finalScore}/${c.maxScore}` : '—'}
                  </td>
                  <td>
                    <Badge variant={c.approvedAt ? 'active' : 'trial'}>
                      {c.approvedAt ? 'REVISADO' : 'IA'}
                    </Badge>
                  </td>
                  <td className="font-mono text-[10px] text-marron-soft">
                    {new Date(c.created_at).toLocaleDateString('es')}
                  </td>
                  <td>
                    <Link
                      to={`/dashboard/resources/${c.id}`}
                      className="font-mono text-[10px] text-marino hover:text-granate transition-colors"
                    >
                      Ver documento →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
