import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cambridgeApi } from '../../services/api';
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
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ level: 'B1', topic: '', exerciseTypes: ['multiple_choice', 'fill_blanks'], totalQuestions: 15, source: 'hybrid' });
  const [result, setResult] = useState(null);

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
          <div className="grid grid-cols-6 gap-2 mb-6">
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
          <div className="grid grid-cols-2 gap-4 mb-4">
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
            <div className="grid grid-cols-2 gap-2">
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
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await cambridgeApi.saveExam({ exam: result });
                  qc.invalidateQueries({ queryKey: ['cambridge-exams'] });
                  qc.invalidateQueries({ queryKey: ['org-stats'] });
                  qc.invalidateQueries({ queryKey: ['notifications-unread'] });
                } catch (e) {
                  console.error('saveExam falló', e);
                }
              }}
            >
              Guardar examen
            </Button>
            <Button variant="ghost" onClick={() => { setStep(0); setResult(null); }}>
              Nuevo examen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
