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
  const [searchParams] = useSearchParams();
  const syllabusItemId = searchParams.get('syllabusItemId');
  const qc = useQueryClient();

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
    mutationFn: () => {
      const [cert, level] = form.certification.split(' ');
      const fd = new FormData();
      fd.append('examImage', file);
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
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const resetForNext = () => {
    setResult(null); setFile(null); setPreview(null);
    setStudentName(''); setFinalScoreOverride('');
  };

  const isSyllabusMode = !!syllabusItemId;
  const referenceReady = isSyllabusMode && !!item?.metadata?.answer_key && !answerKeyDirty;
  const pct = result ? Math.round((result.totalScore / result.maxScore) * 100) : 0;

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

      <div className="grid grid-cols-2 gap-5">
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

function seedAnswerKeyFromPayload(payload) {
  const list = payload?.exercises || payload?.questions || [];
  if (!Array.isArray(list) || list.length === 0) return '';
  return list.map((q, i) => {
    const n = q.number || (i + 1);
    const prompt = q.question || q.prompt || q.title || `Question ${n}`;
    const answer = q.answer || q.correctAnswer || '';
    return `${n}. ${prompt}\n   → ${answer}`;
  }).join('\n\n');
}

// ── Subcomponentes ──────────────────────────────────────────────

function ReferenceKeyPanel({ item, answerKey, dirty, onChange, onSave, saving, ready }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <SectionLabel className="mb-0">CORRECCIÓN DE REFERENCIA</SectionLabel>
        {ready ? <Badge variant="active">VALIDADA</Badge> : <Badge variant="trial">PENDIENTE</Badge>}
      </div>

      {!item && (
        <div className="font-mono text-[11px] text-marron-soft">Cargando ejercicio del temario…</div>
      )}

      {item && (
        <>
          <div className="mb-3 border border-linea bg-card-bg p-3">
            <div className="font-mono text-[10px] text-marron-soft mb-1">EJERCICIO</div>
            <div className="text-[13px] text-tinta font-medium">{item.title}</div>
            {item.library_item_id && (
              <Link to={`/dashboard/resources/${item.library_item_id}`}
                    className="font-mono text-[10px] text-marino hover:text-granate transition-colors">
                Ver ejercicio original →
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

      {!file ? (
        <div
          className="upload-zone mb-3"
          onClick={() => !disabled && fileRef.current.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { if (disabled) return; e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <div className="text-xl text-marron-soft mb-1">◉</div>
          <div className="uz-title">Sube la foto del examen</div>
          <div className="uz-sub">JPG, PNG, WebP o PDF</div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div className="border border-linea mb-3 relative">
          <img src={preview} alt="preview" className="w-full max-h-40 object-cover" />
          <button
            onClick={() => handleFile(null)}
            className="absolute top-2 right-2 bg-papel border border-linea px-2 py-0.5 font-mono text-[10px] text-marron-soft hover:text-granate"
          >
            Cambiar
          </button>
        </div>
      )}

      <ConfigFields form={form} setForm={setForm} disabled={disabled} compact />

      <Button
        className="w-full mt-3"
        loading={isPending}
        disabled={disabled || !file || !studentName.trim()}
        onClick={onCorrect}
      >
        Corregir con la clave validada →
      </Button>
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-linea">
        <SectionLabel className="mb-0">ALUMNOS CORREGIDOS — {corrections.length}</SectionLabel>
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
