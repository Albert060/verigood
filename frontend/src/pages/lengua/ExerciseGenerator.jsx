import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { lenguaApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '1primaria', label: '1º Prim.' }, { value: '2primaria', label: '2º Prim.' },
  { value: '3primaria', label: '3º Prim.' }, { value: '4primaria', label: '4º Prim.' },
  { value: '5primaria', label: '5º Prim.' }, { value: '6primaria', label: '6º Prim.' },
  { value: '1eso', label: '1º ESO' }, { value: '2eso', label: '2º ESO' },
  { value: '3eso', label: '3º ESO' }, { value: '4eso', label: '4º ESO' },
];

const TYPES = [
  { value: 'dictado', label: 'Dictado' },
  { value: 'comprension', label: 'Comprensión' },
  { value: 'redaccion', label: 'Redacción' },
  { value: 'ortografia', label: 'Ortografía' },
  { value: 'sintaxis', label: 'Sintaxis' },
  { value: 'morfologia', label: 'Morfología' },
];

const DIFFICULTIES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'medio', label: 'Medio' },
  { value: 'dificil', label: 'Difícil' },
];

const COUNTS = [3, 5, 8, 10].map((n) => ({ value: n, label: `${n} ej.` }));

export default function ExerciseGenerator() {
  const [form, setForm] = useState({
    course: ['5primaria'],
    types: ['dictado', 'ortografia'],
    difficulty: ['medio'],
    count: [5],
    topic: '',
  });
  const [results, setResults] = useState([]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => lenguaApi.generateExercises({
      course: form.course[0],
      types: form.types,
      difficulty: form.difficulty[0],
      count: form.count[0],
      topic: form.topic,
    }),
    onSuccess: (res) => setResults(res.data.exercises || []),
  });

  const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

  return (
    <div className="animate-slide-in">
      <PageHeader title="Generador de ejercicios" subtitle="LENGUA · DICTADO · COMPRENSIÓN · ORTOGRAFÍA" romanNum="§ II.I" />

      <div className="grid grid-cols-5 gap-5">
        {/* Config */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TIPO DE EJERCICIO</SectionLabel>
            <TagCloud options={TYPES} selected={form.types} onChange={(v) => setForm((f) => ({ ...f, types: v }))} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">DIFICULTAD</SectionLabel>
            <TagCloud options={DIFFICULTIES} selected={form.difficulty} onChange={(v) => setForm((f) => ({ ...f, difficulty: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CANTIDAD</SectionLabel>
            <TagCloud options={COUNTS} selected={form.count} onChange={(v) => setForm((f) => ({ ...f, count: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TEMA (OPCIONAL)</SectionLabel>
            <input
              className="vg-input w-full"
              placeholder="Ej: animales, las estaciones, acentuación..."
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
          </div>

          <Button className="w-full" loading={isPending} onClick={() => mutate()}>
            Generar ejercicios →
          </Button>
        </div>

        {/* Results */}
        <div className="col-span-3">
          {results.length === 0 && !isPending && (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[11px] text-marron-soft">Configura y genera para ver ejercicios</p>
            </div>
          )}

          {isPending && (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-granate border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Generando ejercicios...</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((ex, i) => (
              <div key={i} className="bg-card-bg border border-linea shadow-card card-fold p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-tinta">
                      {ex.title || `Ejercicio ${i + 1}`}
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 border text-granate border-granate bg-[rgba(107,31,42,0.05)]">
                      {TYPE_LABEL[ex.type] || ex.type}
                    </span>
                  </div>
                </div>

                {ex.introduction && (
                  <p className="text-[12px] text-marron-soft leading-relaxed mb-3 italic">{ex.introduction}</p>
                )}

                {ex.text && (
                  <div className="bg-[rgba(184,169,136,0.08)] border border-linea p-3 mb-3">
                    <p className="text-[13px] text-tinta leading-relaxed">{ex.text}</p>
                  </div>
                )}

                {ex.questions?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] text-marron-soft mb-1">PREGUNTAS / ACTIVIDAD</div>
                    {ex.questions.map((q, j) => (
                      <div key={j} className="flex gap-2 text-[12px]">
                        <span className="font-mono text-[10px] text-marron-soft w-5 flex-shrink-0">{j + 1}.</span>
                        <span className="text-tinta">{q}</span>
                      </div>
                    ))}
                  </div>
                )}

                {ex.answer && (
                  <div className="mt-3 pt-3 border-t border-[rgba(184,169,136,0.3)]">
                    <div className="font-mono text-[10px] text-marron-soft mb-1">RESPUESTA / SOLUCIÓN</div>
                    <p className="font-caveat text-[13px] text-granate">{ex.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <DownloadPdfButton
                type="exercises"
                data={{ questions: results.map((e, i) => ({ type: e.type, question: e.content || e.text || `Ejercicio ${i+1}`, answer: e.answer, explanation: e.explanation, points: e.points || 2 })), level: form.course[0], topic: form.topic, totalQuestions: results.length }}
                title="Ejercicios de Lengua"
                subtitle={`${form.course[0]} · ${results.length} ejercicios`}
                moduleKey="espanol"
                filename={`lengua-ejercicios-${Date.now()}`}
              />
              <Button variant="ghost" onClick={() => mutate()}>Regenerar ejercicios</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
