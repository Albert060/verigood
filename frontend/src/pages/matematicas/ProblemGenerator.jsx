import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { matematicasApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '1primaria', label: '1º P.' }, { value: '2primaria', label: '2º P.' },
  { value: '3primaria', label: '3º P.' }, { value: '4primaria', label: '4º P.' },
  { value: '5primaria', label: '5º P.' }, { value: '6primaria', label: '6º P.' },
  { value: '1eso', label: '1º ESO' }, { value: '2eso', label: '2º ESO' },
];

const TOPICS = [
  { value: 'aritmetica', label: 'Aritmética' },
  { value: 'fracciones', label: 'Fracciones' },
  { value: 'decimales', label: 'Decimales' },
  { value: 'geometria', label: 'Geometría' },
  { value: 'algebra', label: 'Álgebra' },
  { value: 'estadistica', label: 'Estadística' },
  { value: 'medidas', label: 'Medidas' },
  { value: 'calculo_mental', label: 'Cálculo mental' },
];

const DIFFICULTIES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Medio' },
  { value: 'dificil', label: 'Difícil' },
];

const COUNTS = [3, 5, 8, 10].map((n) => ({ value: n, label: `${n}` }));

export default function ProblemGenerator() {
  const [form, setForm] = useState({
    course: ['5primaria'],
    topics: ['aritmetica', 'fracciones'],
    difficulty: ['medio'],
    count: [5],
    showSolutions: true,
  });
  const [results, setResults] = useState([]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => matematicasApi.generateProblems({
      course: form.course[0],
      topics: form.topics,
      difficulty: form.difficulty[0],
      count: form.count[0],
    }),
    onSuccess: (res) => setResults(res.data.problems || []),
  });

  const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.value, t.label]));
  const TOPIC_COLORS = { aritmetica: '#1F2A4D', fracciones: '#2D4A6A', decimales: '#2D6A4F', geometria: '#6B1F2A', algebra: '#7A5A1E', estadistica: '#3D3D3D', medidas: '#1A5C35', calculo_mental: '#6B1F2A' };

  return (
    <div className="animate-slide-in">
      <PageHeader title="Generador de problemas" subtitle="MATEMÁTICAS · PASO A PASO" romanNum="§ III.I" />

      <div className="grid grid-cols-5 gap-5">
        {/* Config */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TEMA</SectionLabel>
            <TagCloud options={TOPICS} selected={form.topics} onChange={(v) => setForm((f) => ({ ...f, topics: v }))} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">DIFICULTAD</SectionLabel>
            <TagCloud options={DIFFICULTIES} selected={form.difficulty} onChange={(v) => setForm((f) => ({ ...f, difficulty: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CANTIDAD</SectionLabel>
            <TagCloud options={COUNTS} selected={form.count} onChange={(v) => setForm((f) => ({ ...f, count: v }))} multi={false} />
          </div>

          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="show-solutions"
              checked={form.showSolutions}
              onChange={(e) => setForm((f) => ({ ...f, showSolutions: e.target.checked }))}
              className="w-3.5 h-3.5 border border-linea"
            />
            <label htmlFor="show-solutions" className="font-mono text-[11px] text-marron-soft cursor-pointer">
              Mostrar soluciones paso a paso
            </label>
          </div>

          <Button className="w-full" loading={isPending} onClick={() => mutate()}>
            Generar problemas →
          </Button>
        </div>

        {/* Results */}
        <div className="col-span-3">
          {results.length === 0 && !isPending && (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[11px] text-marron-soft">Configura y genera para ver problemas</p>
            </div>
          )}

          {isPending && (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#2D4A6A] border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Generando problemas...</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((prob, i) => (
              <div key={i} className="bg-card-bg border border-linea shadow-card card-fold p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="font-display italic text-[20px] text-[rgba(45,74,106,0.3)] w-6 flex-shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      {prob.topic && (
                        <span
                          className="font-mono text-[9px] px-1.5 py-0.5 border"
                          style={{ color: TOPIC_COLORS[prob.topic] || '#B8A988', borderColor: TOPIC_COLORS[prob.topic] || '#B8A988', background: `${TOPIC_COLORS[prob.topic] || '#B8A988'}10` }}
                        >
                          {TOPIC_LABELS[prob.topic] || prob.topic}
                        </span>
                      )}
                      {prob.difficulty && (
                        <span className="font-mono text-[9px] text-marron-soft border border-linea px-1.5 py-0.5">{prob.difficulty}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-tinta leading-relaxed">{prob.statement}</p>
                  </div>
                </div>

                {prob.data && Object.keys(prob.data).length > 0 && (
                  <div className="ml-9 mb-2 flex flex-wrap gap-2">
                    {Object.entries(prob.data).map(([k, v]) => (
                      <div key={k} className="bg-[rgba(45,74,106,0.06)] border border-linea px-2 py-1 font-mono text-[11px]">
                        <span className="text-marron-soft">{k}: </span>
                        <span className="text-tinta font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {form.showSolutions && prob.solution && (
                  <div className="ml-9 mt-3 pt-3 border-t border-[rgba(184,169,136,0.3)]">
                    <div className="font-mono text-[10px] text-marron-soft mb-1.5">SOLUCIÓN PASO A PASO</div>
                    {Array.isArray(prob.solution) ? (
                      <ol className="space-y-1">
                        {prob.solution.map((step, j) => (
                          <li key={j} className="flex gap-2 text-[12px]">
                            <span className="font-mono text-[10px] text-marron-soft w-4 flex-shrink-0">{j + 1}.</span>
                            <span className="text-tinta">{step}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-[12px] text-tinta">{prob.solution}</p>
                    )}
                    {prob.answer && (
                      <div className="mt-2 font-caveat text-[15px] text-[#2D4A6A]">
                        Resultado: {prob.answer}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <DownloadPdfButton
                type="problems"
                data={{ problems: results }}
                title="Problemas de Matemáticas"
                subtitle={`${form.course[0]} · ${form.difficulty[0]} · ${results.length} problemas`}
                moduleKey="matematicas"
                filename={`problemas-${form.course[0]}-${Date.now()}`}
              />
              <Button variant="ghost" onClick={() => mutate()}>Regenerar problemas</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
