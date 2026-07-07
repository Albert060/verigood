import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { cambridgeApi, libraryApi, syllabusApi } from '../../services/api';
import { PageHeader, Button, Select, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const EXERCISE_TYPES = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'fill_blanks', label: 'Fill in the blanks' },
  { value: 'true_false', label: 'True / False' },
  { value: 'error_correction', label: 'Error correction' },
  { value: 'word_formation', label: 'Word formation' },
  { value: 'key_word_transformation', label: 'Key word transformation' },
  { value: 'open_cloze', label: 'Open cloze' },
  { value: 'matching', label: 'Matching' },
];

const STEPS = ['Nivel', 'Tema', 'Ejercicios', 'Resultado'];

export default function ExamGenerator() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  // Cuando llega desde el Temario Cambridge (?syllabusItemId=X&topic=Y).
  const syllabusItemId = searchParams.get('syllabusItemId');
  const topicFromUrl   = searchParams.get('topic');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    level: 'B1',
    topic: topicFromUrl || '',
    exerciseTypes: ['multiple_choice', 'fill_blanks'],
    totalQuestions: 15,
    source: 'hybrid',
  });
  const [result, setResult] = useState(null);
  const [savedId, setSavedId] = useState(null);
  // T3 · Estados independientes para library-save vs syllabus-link.
  const [linking, setLinking] = useState(false); // en curso
  const [linkError, setLinkError] = useState(null); // último error (para reintento)

  // Al llegar con ?topic=... precargamos el campo de tema del formulario.
  // T18 · Disable INTENCIONADO: no queremos re-precargar si el usuario
  // limpia el input manualmente (form.topic → ''). Si añadimos form.topic
  // como dep, borrar el campo devolvería el valor de la URL en bucle.
  useEffect(() => {
    if (topicFromUrl && !form.topic) {
      setForm((f) => ({ ...f, topic: topicFromUrl }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicFromUrl]);

  // Auto-persistencia del examen generado en la biblioteca del centro y —
  // si venimos del Temario — link automático al syllabus_item para que la
  // casilla del temario deje de estar "por generar" y pase a "generado"
  // (badge verde CONTRATADO/EXAMEN + botón Corregir). Best-effort: si algo
  // falla, seguimos mostrando el resultado al usuario.
  const linkToSyllabus = async (exam) => {
    if (linking) return; // T3 · previene doble-lanzamiento por doble clic
    setLinking(true);
    setLinkError(null);
    let libraryItemId = savedId;
    try {
      // Paso 1: si aún no está guardado, persistimos en biblioteca.
      if (!libraryItemId) {
        const title = `Examen Cambridge ${exam.level}${exam.topic ? ` — ${exam.topic}` : ''}`.slice(0, 255);
        const { data: created } = await libraryApi.create({
          moduleId: 'cambridge',
          toolKey: 'cambridge:exam',
          kind: 'exam',
          title,
          payload: exam,
          metadata: {
            level: exam.level,
            topic: exam.topic || '',
            totalQuestions: exam.totalQuestions,
            exerciseTypes: form.exerciseTypes,
            source: form.source,
            autoSaved: true,
          },
        });
        libraryItemId = created.id;
        setSavedId(libraryItemId);
        qc.invalidateQueries({ queryKey: ['library'] });
      }
      // Paso 2: si veníamos del temario, linkeamos.
      if (syllabusItemId) {
        await syllabusApi.updateItem(syllabusItemId, { library_item_id: libraryItemId });
        qc.invalidateQueries({ queryKey: ['syllabus'] });
        qc.invalidateQueries({ queryKey: ['syllabus-item', syllabusItemId] });
      }
    } catch (err) {
      // T3 · propagamos el error a la UI en vez de solo console.warn
      const msg = err?.response?.data?.error || err.message || 'Error al vincular con el temario';
      console.warn('Cambridge exam auto-save/link failed:', msg);
      setLinkError(msg);
    } finally {
      setLinking(false);
    }
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => cambridgeApi.generateExam(form),
    onSuccess: (res) => {
      setResult(res.data);
      setStep(3);
      // Refresca dashboards y biblioteca al instante (el backend ya escribió
      // en usage_logs; sin invalidar, los Dashboards seguirían con la versión
      // cacheada de antes de generar).
      qc.invalidateQueries({ queryKey: ['org-stats'] });
      qc.invalidateQueries({ queryKey: ['cambridge-exams'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      // Auto-guarda y linkea al temario (si aplica). No await — que corra en background.
      linkToSyllabus(res.data);
    },
  });

  const next = () => setStep((s) => Math.min(s + 1, 2));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="animate-slide-in">
      <PageHeader title="Nuevo examen" subtitle="CAMBRIDGE · GENERADOR DE EXÁMENES" romanNum="§ I.I" />

      {/* Steps */}
      <div className="flex items-center mb-6 pb-5 border-b border-linea">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`wstep-num ${i < step ? 'done' : i === step ? 'current' : ''}`}>{i + 1}</div>
              <span className={`text-[12px] ${i === step ? 'text-tinta font-medium' : i < step ? 'text-[#2D6A4F]' : 'text-marron-soft'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-linea opacity-40 mx-3" />}
          </div>
        ))}
      </div>

      {/* Context bar */}
      {step > 0 && (
        <div className="bg-[rgba(184,169,136,0.1)] border border-linea p-3 mb-4 flex gap-4 font-mono text-[11px]">
          <span>Nivel: <strong className="text-tinta">{form.level}</strong></span>
          {step > 1 && form.topic && <span>Tema: <strong className="text-tinta">{form.topic}</strong></span>}
          {step > 1 && <span>Preguntas: <strong className="text-tinta">{form.totalQuestions}</strong></span>}
        </div>
      )}

      {/* Step 0 — Level */}
      {step === 0 && (
        <div>
          <SectionLabel className="mb-3">SELECCIONA EL NIVEL CEFR</SectionLabel>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setForm((f) => ({ ...f, level: l }))}
                className={`py-3 border font-mono text-[14px] font-bold transition-all duration-150 ${
                  form.level === l ? 'bg-marino text-papel border-marino' : 'border-linea text-marron-soft hover:border-tinta hover:text-tinta bg-card-bg'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex justify-end"><Button onClick={next}>Siguiente →</Button></div>
        </div>
      )}

      {/* Step 1 — Topic + count */}
      {step === 1 && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <SectionLabel className="mb-2">TEMA GRAMATICAL / VOCABULARIO</SectionLabel>
              <input
                className="vg-input"
                placeholder="Present perfect, conditionals, travel vocabulary..."
                value={form.topic}
                onChange={set('topic')}
              />
            </div>
            <div>
              <SectionLabel className="mb-2">NÚMERO DE PREGUNTAS</SectionLabel>
              <select className="vg-select" value={form.totalQuestions} onChange={set('totalQuestions')}>
                {[5, 10, 15, 20, 25, 30, 40].map((n) => <option key={n} value={n}>{n} preguntas</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={prev}>Atrás</Button>
            <Button onClick={next}>Siguiente →</Button>
          </div>
        </div>
      )}

      {/* Step 2 — Exercise types + source */}
      {step === 2 && (
        <div>
          <SectionLabel className="mb-3">TIPOS DE EJERCICIO</SectionLabel>
          <TagCloud
            options={EXERCISE_TYPES}
            selected={form.exerciseTypes}
            onChange={(v) => setForm((f) => ({ ...f, exerciseTypes: v }))}
            multi
          />

          <div className="mt-5 mb-4">
            <SectionLabel className="mb-2">FUENTE DE PREGUNTAS</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { value: 'hybrid', label: 'Híbrido (recomendado)', desc: 'Base de datos + IA completa el resto' },
                { value: 'ai_only', label: 'Solo IA', desc: 'Claude Sonnet genera todo el examen' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, source: opt.value }))}
                  className={`text-left p-3 border transition-all duration-150 ${
                    form.source === opt.value ? 'border-2 border-marino bg-[rgba(31,42,77,0.05)]' : 'border-linea bg-card-bg'
                  }`}
                >
                  <div className="text-[13px] font-medium text-tinta mb-0.5">{opt.label}</div>
                  <div className="font-mono text-[10px] text-marron-soft">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={prev}>Atrás</Button>
            <Button loading={isPending} onClick={() => mutate()}>
              Generar examen →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Result */}
      {step === 3 && result && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="font-mono text-[11px] text-[#2D6A4F] bg-[#EBF5EF] border border-[#7DC49B] px-2 py-1">
              Examen generado · {result.totalQuestions} preguntas
            </div>
            <div className="font-mono text-[11px] text-marron-soft">
              {result.dbCount} de BD · {result.aiCount} por IA
            </div>
          </div>

          <div className="space-y-3 mb-5">
            {(result.questions || []).slice(0, 5).map((q, i) => (
              <div key={i} className="bg-card-bg border border-linea p-4 card-fold">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[11px] text-marron-soft w-6 flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <div className="flex-1">
                    <p className="text-[13px] text-tinta mb-1">{q.question}</p>
                    {q.options && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {q.options.map((opt, j) => (
                          <span key={j} className={`font-mono text-[11px] px-2 py-0.5 border ${
                            opt === q.answer ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]' : 'border-linea text-marron-soft'
                          }`}>
                            {String.fromCharCode(65 + j)}) {opt}
                          </span>
                        ))}
                      </div>
                    )}
                    {q.answer && !q.options && (
                      <div className="font-caveat text-[14px] text-granate mt-1">{q.answer}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {result.questions?.length > 5 && (
              <div className="font-mono text-[11px] text-marron-soft text-center py-2">
                + {result.questions.length - 5} preguntas más
              </div>
            )}
          </div>

          {/* T3 · Estado real del guardado. Tres estados posibles:
                - linking: en curso (spinner).
                - linkError: falló algo (mostrar aviso + botón reintentar).
                - savedId sin error: éxito.
              El "· vinculado al temario" solo se muestra si el link no
              produjo error, ya no es un falso positivo. */}
          <div className="mb-3 flex items-center gap-2 flex-wrap font-mono text-[11px]">
            {linking && (
              <span className="px-2 py-0.5 border border-linea text-marron-soft">
                Guardando…
              </span>
            )}
            {!linking && savedId && !linkError && (
              <span className="px-2 py-0.5 border border-[#7DC49B] bg-[#EBF5EF] text-[#1A5C35]">
                ✓ Guardado en biblioteca{syllabusItemId ? ' · vinculado al temario' : ''}
              </span>
            )}
            {!linking && linkError && (
              <>
                <span className="px-2 py-0.5 border border-granate bg-[#FCF0F0] text-granate">
                  ✗ {savedId ? 'Guardado pero sin vincular' : 'Error al guardar'}: {linkError}
                </span>
                <button
                  onClick={() => linkToSyllabus(result)}
                  className="px-2 py-0.5 border border-marino text-marino hover:bg-marino hover:text-papel transition-colors"
                >
                  Reintentar
                </button>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <DownloadPdfButton
              type="exam"
              data={result}
              title={`Examen ${result.level}`}
              subtitle={[result.topic, `${result.totalQuestions} preguntas`].filter(Boolean).join(' · ')}
              moduleKey="cambridge"
              filename={`cambridge-${result.level}-${Date.now()}`}
              size="lg"
            />
            <Button variant="ghost" onClick={() => { setStep(0); setResult(null); setSavedId(null); setLinkError(null); }}>
              Nuevo examen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
