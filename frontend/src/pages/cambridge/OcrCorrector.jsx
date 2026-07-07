import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { cambridgeApi, libraryApi, syllabusApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel, ProgressBar, Badge, Card } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const CERTIFICATIONS = ['KET A2', 'PET B1', 'FCE B2', 'CAE C1', 'CPE C2'];
const FEEDBACK_MODES = [
  { value: 'full', label: 'Completo' },
  { value: 'score_only', label: 'Solo nota' },
  { value: 'brief', label: 'Breve' },
];

// Corrector Cambridge — dos modos:
//   - Suelto: sube foto y corrige (comportamiento original).
//   - Anclado al temario (?syllabusItemId=X): panel izquierdo con la clave de
//     respuestas de referencia editable (B2), reuso automático de esa clave en
//     cada foto (B3), preguntas de desarrollo en rojo (B4), visto bueno con
//     nota final (B5) y lista de alumnos corregidos con Ver documento (B6, B7).
export default function OcrCorrector() {
  const [searchParams, setSearchParams] = useSearchParams();
  const syllabusItemId = searchParams.get('syllabusItemId');
  const qc = useQueryClient();

  // Temario Cambridge — para el selector Tema/Ejercicio en el corrector.
  const { data: syllabusData } = useQuery({
    queryKey: ['syllabus', 'cambridge'],
    queryFn: () => syllabusApi.get('cambridge').then((r) => r.data),
    staleTime: 60_000,
  });

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ certification: 'PET B1', feedbackMode: 'full' });
  const [studentName, setStudentName] = useState('');
  const [result, setResult] = useState(null);
  const [finalScoreOverride, setFinalScoreOverride] = useState('');
  const fileRef = useRef();

  // Modo temario — item + clave de referencia editable.
  const { data: itemData } = useQuery({
    queryKey: ['syllabus-item', syllabusItemId],
    queryFn: () => syllabusApi.getItem(syllabusItemId).then((r) => r.data),
    enabled: !!syllabusItemId,
    staleTime: 30_000,
  });
  const item = itemData?.item || null;

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

    // Autoprecarga de la certificación desde el level del payload/metadata.
    // Cambridge guarda 'B1', 'A2', … y el selector espera 'PET B1' etc.
    // Mapa nivel → certificación estándar.
    const LEVEL_TO_CERT = {
      A2: 'KET A2', B1: 'PET B1', B2: 'FCE B2', C1: 'CAE C1', C2: 'CPE C2',
    };
    const lvl = item.library_payload?.level || item.metadata?.level;
    if (lvl && LEVEL_TO_CERT[lvl]) {
      setForm((f) => ({ ...f, certification: LEVEL_TO_CERT[lvl] }));
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

  const { data: correctionsData } = useQuery({
    queryKey: ['syllabus-item-corrections', syllabusItemId],
    queryFn: () => syllabusApi.listCorrections(syllabusItemId).then((r) => r.data),
    enabled: !!syllabusItemId,
    staleTime: 30_000,
  });
  const corrections = correctionsData?.corrections || [];

  const { mutate, isPending } = useMutation({
    // fileArg permite auto-correr desde handleFile sin leer state stale.
    mutationFn: (fileArg) => {
      const uploadFile = fileArg || file;
      const [cert, level] = form.certification.split(' ');
      const fd = new FormData();
      fd.append('examImage', uploadFile);
      fd.append('certification', cert);
      fd.append('level', level);
      fd.append('feedbackMode', form.feedbackMode);
      if (syllabusItemId) fd.append('syllabusItemId', syllabusItemId);
      if (studentName)    fd.append('studentName', studentName);
      const savedKey = item?.metadata?.answer_key;
      if (savedKey) fd.append('referenceAnswerKey', savedKey);
      return cambridgeApi.correctOcr(fd);
    },
    onSuccess: (res) => {
      setResult(res.data);
      setFinalScoreOverride(String(res.data.totalScore ?? ''));
      qc.invalidateQueries({ queryKey: ['syllabus-item-corrections', syllabusItemId] });
    },
  });

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

  const handleFile = (f) => {
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    const referenceOK = syllabusItemId && !!item?.metadata?.answer_key && !answerKeyDirty;
    if (referenceOK && studentName.trim() && !isPending) {
      mutate(f);
    }
  };
  const resetForNext = () => {
    setResult(null); setFile(null); setPreview(null);
    setStudentName(''); setFinalScoreOverride('');
  };

  const isSyllabusMode = !!syllabusItemId;
  const referenceReady = isSyllabusMode && !!item?.metadata?.answer_key && !answerKeyDirty;
  const pct = result ? Math.round((result.totalScore / result.maxScore) * 100) : 0;

  const syllabusSections = syllabusData?.sections || [];

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Corregir ejercicio"
        subtitle={
          isSyllabusMode && item
            ? `${item.title.toUpperCase()} · CAMBRIDGE`
            : 'CAMBRIDGE · SUBE UNA FOTO · CORRECCIÓN AUTOMÁTICA'
        }
        romanNum="§ I.II"
      />

      <TemaSelector
        sections={syllabusSections}
        currentItemId={syllabusItemId}
        currentItem={item}
        onPick={(itemId) => {
          const p = new URLSearchParams(searchParams);
          if (itemId) {
            p.set('syllabusItemId', itemId);
          } else {
            p.delete('syllabusItemId');
          }
          setSearchParams(p);
          setResult(null); setFile(null); setPreview(null);
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Panel izquierdo ────────────────────────────────── */}
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

        {/* ── Panel derecho ─────────────────────────────────── */}
        <div>
          {isSyllabusMode && (
            <PhotoUploadForStudent
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
              pct={pct}
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

      {isSyllabusMode && corrections.length > 0 && (
        <StudentsList corrections={corrections} />
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

// Deriva un borrador de referencia a partir del payload del library item.
// Cubre todos los output_kind (ejercicio, examen, presentación, dinámica,
// documentación, rúbrica, timeline, texto plano). Sin datos → JSON legible.
function seedAnswerKeyFromPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;

  // Ejercicios / exámenes / cuestionarios.
  const list = payload.exercises || payload.questions;
  if (Array.isArray(list) && list.length > 0) {
    return list.map((q, i) => {
      const n = q.number || (i + 1);
      const prompt = q.question || q.prompt || q.title || `Question ${n}`;
      const answer = q.answer || q.correctAnswer || '';
      return `${n}. ${prompt}\n   → ${answer}`;
    }).join('\n\n');
  }

  // Presentaciones (slides).
  if (Array.isArray(payload.slides) && payload.slides.length > 0) {
    return payload.slides.map((s, i) => {
      const title = s.title || `Slide ${i + 1}`;
      const bullets = Array.isArray(s.bullets) ? s.bullets.map((b) => `   · ${b}`).join('\n') : '';
      return `${i + 1}. ${title}${bullets ? '\n' + bullets : ''}`;
    }).join('\n\n');
  }

  // Dinámicas (instrucciones).
  if (Array.isArray(payload.instructions) && payload.instructions.length > 0) {
    const header = payload.title || 'Dinámica';
    const desc = payload.description ? `\n${payload.description}\n` : '';
    const inst = payload.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n');
    return `${header}${desc}\nInstrucciones:\n${inst}`;
  }

  // Rúbricas.
  if (Array.isArray(payload.criteria) && payload.criteria.length > 0) {
    return payload.criteria.map((c, i) => {
      const name = c.name || c.title || `Criterio ${i + 1}`;
      const desc = c.description || c.desc || '';
      return `${i + 1}. ${name}${desc ? `\n   ${desc}` : ''}`;
    }).join('\n\n');
  }

  // Timelines.
  if (Array.isArray(payload.events) && payload.events.length > 0) {
    return payload.events.map((e, i) => {
      const when = e.year || e.date || (i + 1);
      const title = e.title || e.name || '';
      const desc = e.description || e.desc || '';
      return `${when}. ${title}${desc ? ` — ${desc}` : ''}`;
    }).join('\n');
  }

  // Textos.
  if (typeof payload.text === 'string' && payload.text.trim())      return payload.text;
  if (typeof payload.content === 'string' && payload.content.trim()) return payload.content;
  if (typeof payload.markdown === 'string' && payload.markdown.trim()) return payload.markdown;
  if (typeof payload.summary === 'string' && payload.summary.trim())  return payload.summary;

  // Último recurso: JSON legible que el profe puede editar a mano.
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return '';
  }
}

// ── Subcomponentes ──────────────────────────────────────────────

function ReferenceKeyPanel({ item, answerKey, dirty, onChange, onSave, saving, ready }) {
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
        {ready ? <Badge variant="active">VALIDADA</Badge> : <Badge variant="trial">PENDIENTE</Badge>}
      </div>

      {!item && (
        <div className="font-mono text-[11px] text-marron-soft">Cargando actividad del temario…</div>
      )}

      {item && (
        <>
          <div className="mb-3 border border-linea bg-card-bg p-3">
            <div className="font-mono text-[10px] text-marron-soft mb-1">{kindLabel}</div>
            <div className="text-[13px] text-tinta font-medium">{item.title}</div>
            {item.library_item_id && (
              <Link to={`/dashboard/resources/${item.library_item_id}`}
                    className="font-mono text-[10px] text-marino hover:text-granate transition-colors">
                Ver {kindLower} original →
              </Link>
            )}
          </div>

          <label className="font-mono text-[10px] text-marron-soft block mb-1">
            CLAVE DE RESPUESTAS EDITABLE
          </label>
          <textarea
            value={answerKey}
            onChange={(e) => onChange(e.target.value)}
            placeholder={'1. Question…\n   → Correct answer\n\n2. Question…\n   → Correct answer'}
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

function StandaloneConfigPanel({ form, setForm, file, preview, handleFile, fileRef, onCorrect, isPending }) {
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
            onClick={() => handleFile(null)}
            className="absolute top-2 right-2 bg-papel border border-linea px-2 py-0.5 font-mono text-[10px] text-marron-soft hover:text-granate"
          >
            Cambiar
          </button>
        </div>
      )}
      <ConfigFields form={form} setForm={setForm} />
      <Button className="w-full mt-3" loading={isPending} disabled={!file} onClick={onCorrect}>
        Corregir examen →
      </Button>
    </div>
  );
}

function PhotoUploadForStudent({
  form, setForm, file, preview, handleFile, fileRef,
  studentName, setStudentName, onCorrect, isPending, disabled, answerKeyDirty,
}) {
  // El upload zone queda deshabilitado hasta que el profe haya escrito el
  // nombre del alumno — así el auto-fire al subir siempre tiene lo necesario.
  const readyToShoot = !disabled && studentName.trim() && !isPending;

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

      <ConfigFields form={form} setForm={setForm} disabled={disabled} compact />

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
                : 'Escribe primero el nombre del alumno'}
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="border border-linea mb-2 relative">
            <img src={preview} alt="preview" className="w-full max-h-40 object-cover" />
            <button
              onClick={() => handleFile(null)}
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

      {file && !isPending && (
        <Button
          className="w-full mt-1"
          disabled={disabled || !studentName.trim()}
          onClick={onCorrect}
        >
          Volver a corregir con estos parámetros →
        </Button>
      )}
    </div>
  );
}

// Selector Tema → Actividad del temario Cambridge — mismo patrón que el
// corrector genérico. Muestra TODOS los items (no solo ejercicios/exámenes).
function TemaSelector({ sections, currentItemId, currentItem, onPick }) {
  const KIND_ICON = {
    exam: '📝', exercise: '✎', dynamic: '◆', presentation: '▥', documentation: '▤',
  };

  const currentSectionId =
    currentItem?.section_id ??
    sections.find((s) => (s.items || []).some((it) => it.id === currentItemId))?.id ??
    '';
  const [tema, setTema] = useState(currentSectionId);
  useEffect(() => { setTema(currentSectionId); }, [currentSectionId]);

  const sectionItems = (sections.find((s) => s.id === tema)?.items || []);
  const totalItems = sections.reduce((s, sec) => s + (sec.items || []).length, 0);

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
              ? 'Este tema no tiene actividades'
              : 'Elige una actividad…'}
        </option>
        {sectionItems.map((it) => (
          <option key={it.id} value={it.id}>
            {(KIND_ICON[it.kind] || '·')} {it.title}
          </option>
        ))}
      </select>

      {currentItemId && (
        <button
          onClick={() => onPick(null)}
          className="font-mono text-[10px] text-marron-soft hover:text-tinta transition-colors"
        >
          Quitar
        </button>
      )}

      <span className="font-mono text-[10px] text-marron-soft ml-auto">
        {totalItems} {totalItems === 1 ? 'actividad' : 'actividades'} en el temario
      </span>
    </div>
  );
}

function ConfigFields({ form, setForm, disabled = false, compact = false }) {
  return (
    <>
      <div className={compact ? 'mb-2' : 'mb-4'}>
        <SectionLabel className="mb-2">CERTIFICACIÓN</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {CERTIFICATIONS.map((c) => (
            <button
              key={c}
              onClick={() => setForm((f) => ({ ...f, certification: c }))}
              disabled={disabled}
              className={`py-1.5 border font-mono text-[11px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                form.certification === c ? 'bg-marino text-papel border-marino' : 'border-linea text-marron-soft hover:border-tinta bg-card-bg'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="mb-2">
          <SectionLabel className="mb-2">NIVEL DE FEEDBACK</SectionLabel>
          <TagCloud
            options={FEEDBACK_MODES}
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
  result, pct, studentName,
  finalScoreOverride, setFinalScoreOverride, approve,
  isSyllabusMode, onNext,
}) {
  // B4 — preguntas de desarrollo mal respondidas: marcadas en rojo.
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
            {studentName || `${result.certification || ''} ${result.level || ''}`.trim()}
          </SectionLabel>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[32px] text-tinta">{result.totalScore}</span>
            <span className="font-mono text-[14px] text-marron-soft">/ {result.maxScore}</span>
          </div>
          <ProgressBar value={result.totalScore} max={result.maxScore} className="w-32 mt-1" />
        </div>
        <div className="score-stamp text-[22px]">
          {result.grade || (pct >= 70 ? 'PASS' : 'FAIL')}
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
                    {q.question || `Question ${q.number}`}
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

      {result.studyRecommendations?.length > 0 && (
        <Card className="p-4">
          <SectionLabel className="mb-2">RECOMENDACIONES</SectionLabel>
          <div className="space-y-1.5">
            {result.studyRecommendations.map((r, i) => (
              <div key={i} className="flex gap-2 text-[12px]">
                <span className="text-marron-soft font-mono">—</span>
                <span className="text-marron-soft">{r}</span>
              </div>
            ))}
          </div>
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
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <DownloadPdfButton
          type="ocr"
          data={result}
          title={`Corrección ${result.certification || ''} ${studentName || ''}`.trim()}
          subtitle={`Puntuación ${result.totalScore}/${result.maxScore}`}
          moduleKey="cambridge"
          filename={`correccion-cambridge-${(studentName || 'alumno').replace(/\s+/g, '_')}-${Date.now()}`}
        />
        <Button variant="ghost" onClick={onNext}>
          {isSyllabusMode ? 'Siguiente alumno →' : 'Nueva corrección'}
        </Button>
      </div>
    </div>
  );
}

function StudentsList({ corrections }) {
  const avgScore = useMemo(() => {
    const w = corrections.filter((c) => c.totalScore != null);
    if (w.length === 0) return null;
    const sum = w.reduce((a, c) => a + (c.finalScore ?? c.totalScore), 0);
    return Math.round((sum / w.length) * 10) / 10;
  }, [corrections]);

  return (
    <div className="mt-6 bg-card-bg border border-linea shadow-card">
      <div className="flex items-center justify-between px-3 md:px-4 py-3 border-b border-linea flex-wrap gap-2">
        <SectionLabel className="mb-0">ALUMNOS CORREGIDOS — {corrections.length}</SectionLabel>
        {avgScore != null && (
          <span className="font-mono text-[11px] text-marron-soft">
            Nota media: <span className="font-bold text-tinta">{avgScore}</span>
          </span>
        )}
      </div>

      {/* Móvil + tablet (< lg): tarjetas apiladas por alumno. */}
      <div className="lg:hidden divide-y divide-linea">
        {corrections.map((c) => {
          const finalScore = c.finalScore ?? c.totalScore;
          return (
            <div key={c.id} className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-medium text-tinta text-[14px] flex-1 min-w-0 truncate">
                  {c.studentName || '—'}
                </span>
                <Badge variant={c.approvedAt ? 'active' : 'trial'}>
                  {c.approvedAt ? 'REVISADO' : 'IA'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3 text-[12px] mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[10px] text-marron-soft">IA:</span>
                  <span className="font-mono text-marron-soft">
                    {c.totalScore != null ? `${c.totalScore}/${c.maxScore}` : '—'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-[10px] text-marron-soft">Final:</span>
                  <span className="font-mono text-tinta font-bold">
                    {finalScore != null ? `${finalScore}/${c.maxScore}` : '—'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-marron-soft">
                  {new Date(c.created_at).toLocaleDateString('es')}
                </span>
              </div>
              <Link
                to={`/dashboard/resources/${c.id}`}
                className="inline-block font-mono text-[11px] text-marino hover:text-granate transition-colors"
              >
                Ver documento →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Desktop (lg+): tabla clásica. */}
      <div className="hidden lg:block overflow-x-auto">
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
                    <Link to={`/dashboard/resources/${c.id}`}
                          className="font-mono text-[10px] text-marino hover:text-granate transition-colors">
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
