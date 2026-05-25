import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { medioApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '1primaria', label: '1º' }, { value: '2primaria', label: '2º' },
  { value: '3primaria', label: '3º' }, { value: '4primaria', label: '4º' },
  { value: '5primaria', label: '5º' }, { value: '6primaria', label: '6º' },
];

const QUESTION_TYPES = [
  { value: 'comprension', label: 'Comprensión' },
  { value: 'verdadero_falso', label: 'V / F' },
  { value: 'multiple_choice', label: 'Múltiple opción' },
  { value: 'definicion', label: 'Definición' },
  { value: 'relacionar', label: 'Relacionar' },
];

const COUNTS = [5, 8, 10, 15].map((n) => ({ value: n, label: `${n} preg.` }));

export default function Questionnaires() {
  const [sourceType, setSourceType] = useState('topic');
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [form, setForm] = useState({
    course: ['4primaria'],
    questionTypes: ['comprension', 'verdadero_falso'],
    count: [10],
  });
  const [result, setResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => medioApi.generateQuiz({
      course: form.course[0],
      questionTypes: form.questionTypes,
      count: form.count[0],
      ...(sourceType === 'topic' ? { topic } : { text }),
    }),
    onSuccess: (res) => setResult(res.data),
  });

  const canGenerate = (sourceType === 'topic' && topic.trim()) || (sourceType === 'text' && text.trim().length > 30);

  return (
    <div className="animate-slide-in">
      <PageHeader title="Cuestionarios automáticos" subtitle="C. DEL MEDIO · PREGUNTAS DE COMPRENSIÓN" romanNum="§ IV.II" />

      <div className="grid grid-cols-5 gap-5">
        {/* Config */}
        <div className="col-span-2 space-y-4">
          {/* Source type */}
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">FUENTE</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {[{ v: 'topic', l: 'Por tema' }, { v: 'text', l: 'Desde texto' }].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setSourceType(v)}
                  className={`py-1.5 border font-mono text-[11px] transition-all ${
                    sourceType === v ? 'bg-[#1A5C35] text-papel border-[#1A5C35]' : 'border-linea text-marron-soft hover:border-tinta bg-card-bg'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {sourceType === 'topic' ? (
              <input
                className="vg-input w-full"
                placeholder="Ej: El aparato digestivo..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            ) : (
              <textarea
                className="vg-textarea w-full h-24 text-[12px]"
                placeholder="Pega el texto del libro o apuntes..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TIPOS DE PREGUNTAS</SectionLabel>
            <TagCloud options={QUESTION_TYPES} selected={form.questionTypes} onChange={(v) => setForm((f) => ({ ...f, questionTypes: v }))} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CANTIDAD</SectionLabel>
            <TagCloud options={COUNTS} selected={form.count} onChange={(v) => setForm((f) => ({ ...f, count: v }))} multi={false} />
          </div>

          <Button className="w-full" loading={isPending} disabled={!canGenerate} onClick={() => mutate()}>
            Generar cuestionario →
          </Button>
        </div>

        {/* Result */}
        <div className="col-span-3">
          {!result && !isPending && (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[11px] text-marron-soft">El cuestionario aparecerá aquí</p>
            </div>
          )}

          {isPending && (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#1A5C35] border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Generando preguntas...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Header */}
              <div className="bg-card-bg border border-linea p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[13px] text-tinta">{result.title || 'Cuestionario'}</div>
                  <div className="font-mono text-[10px] text-marron-soft">{result.questions?.length || 0} preguntas · {form.course[0]}</div>
                </div>
                <div className="font-mono text-[10px] text-[#1A5C35] border border-[#1A5C35] px-2 py-1 bg-[rgba(26,92,53,0.05)]">
                  LISTO
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-2">
                {(result.questions || []).map((q, i) => (
                  <div key={i} className="bg-card-bg border border-linea shadow-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[11px] text-marron-soft w-5 flex-shrink-0 mt-0.5">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[9px] text-[#1A5C35] border border-[#1A5C35] px-1 py-0.5">
                            {q.type}
                          </span>
                        </div>
                        <p className="text-[13px] text-tinta mb-2">{q.question}</p>

                        {/* Multiple choice options */}
                        {q.options && (
                          <div className="space-y-1">
                            {q.options.map((opt, j) => (
                              <div
                                key={j}
                                className={`flex items-center gap-2 px-2 py-1 border font-mono text-[11px] ${
                                  opt === q.answer
                                    ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]'
                                    : 'border-linea text-marron-soft'
                                }`}
                              >
                                <span>{String.fromCharCode(65 + j)})</span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* V/F */}
                        {q.type === 'verdadero_falso' && q.answer !== undefined && (
                          <div className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-1 border mt-1 ${
                            q.answer === true || q.answer === 'verdadero'
                              ? 'text-[#1A5C35] border-[#7DC49B] bg-[#EBF5EF]'
                              : 'text-granate border-granate bg-[rgba(107,31,42,0.05)]'
                          }`}>
                            {q.answer === true || q.answer === 'verdadero' ? 'VERDADERO' : 'FALSO'}
                          </div>
                        )}

                        {/* Open answer */}
                        {q.answer && q.type !== 'verdadero_falso' && !q.options && (
                          <div className="mt-1.5 font-caveat text-[13px] text-granate">
                            → {q.answer}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="exam"
                  data={result}
                  title={`Cuestionario — ${result.topic}`}
                  subtitle={`${result.grade}º Primaria · ${(result.questions || []).length} preguntas`}
                  moduleKey="medio"
                  filename={`cuestionario-medio-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => { setResult(null); }}>Nuevo cuestionario</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
