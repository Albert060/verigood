import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { matematicasApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '1primaria', label: '1º P.' }, { value: '2primaria', label: '2º P.' },
  { value: '3primaria', label: '3º P.' }, { value: '4primaria', label: '4º P.' },
  { value: '5primaria', label: '5º P.' }, { value: '6primaria', label: '6º P.' },
  { value: '1eso', label: '1º ESO' },
];

const SERIES_TYPES = [
  { value: 'calculo_mental', label: 'Cálculo mental' },
  { value: 'fracciones', label: 'Fracciones' },
  { value: 'decimales', label: 'Decimales' },
  { value: 'geometria', label: 'Geometría' },
  { value: 'estadistica', label: 'Estadística' },
  { value: 'ecuaciones', label: 'Ecuaciones' },
  { value: 'operaciones', label: 'Operaciones básicas' },
];

const COUNTS = [10, 15, 20, 25].map((n) => ({ value: n, label: `${n}` }));
const FORMATS = [
  { value: 'ficha', label: 'Ficha de trabajo' },
  { value: 'test', label: 'Test rápido' },
  { value: 'repaso', label: 'Repaso' },
];

export default function ExerciseSeries() {
  const [form, setForm] = useState({
    course: ['4primaria'],
    type: ['calculo_mental'],
    count: [15],
    format: ['ficha'],
  });
  const [result, setResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => matematicasApi.generateSeries({
      course: form.course[0],
      type: form.type[0],
      count: form.count[0],
      format: form.format[0],
    }),
    onSuccess: (res) => setResult(res.data),
  });

  return (
    <div className="animate-slide-in">
      <PageHeader title="Series y ejercicios" subtitle="MATEMÁTICAS · FICHAS DE TRABAJO" romanNum="§ III.III" />

      <div className="grid grid-cols-5 gap-5">
        {/* Config */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TIPO DE EJERCICIOS</SectionLabel>
            <TagCloud options={SERIES_TYPES} selected={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CANTIDAD</SectionLabel>
            <TagCloud options={COUNTS} selected={form.count} onChange={(v) => setForm((f) => ({ ...f, count: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">FORMATO</SectionLabel>
            <TagCloud options={FORMATS} selected={form.format} onChange={(v) => setForm((f) => ({ ...f, format: v }))} multi={false} />
          </div>

          <Button className="w-full" loading={isPending} onClick={() => mutate()}>
            Generar serie →
          </Button>
        </div>

        {/* Result */}
        <div className="col-span-3">
          {!result && !isPending && (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[11px] text-marron-soft">Configura y genera la serie</p>
            </div>
          )}

          {isPending && (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-[#2D4A6A] border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Generando serie de ejercicios...</p>
            </div>
          )}

          {result && (
            <div>
              {/* Header */}
              <div className="bg-card-bg border border-linea p-4 mb-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[14px] text-tinta">{result.title || 'Serie de ejercicios'}</div>
                  <div className="font-mono text-[11px] text-marron-soft mt-0.5">
                    {result.exercises?.length || 0} ejercicios · {form.course[0]} · {form.type[0]}
                  </div>
                </div>
                <div className="font-mono text-[10px] text-marron-soft border border-linea px-2 py-1">
                  {form.format[0]}
                </div>
              </div>

              {/* Exercises grid */}
              <div className="bg-card-bg border border-linea p-4 mb-3">
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {(result.exercises || []).map((ex, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-marron-soft w-6 flex-shrink-0 text-right">{i + 1}.</span>
                      <span className="text-[13px] text-tinta flex-1">{ex.expression || ex.problem}</span>
                      <span className="text-[13px] text-marron-soft w-16">= ______</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Answer key */}
              {result.answers && (
                <div className="bg-card-bg border border-linea p-4 mb-3">
                  <SectionLabel className="mb-2">SOLUCIONES</SectionLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {(result.exercises || []).map((ex, i) => (
                      <div key={i} className="flex items-center gap-1 font-mono text-[11px]">
                        <span className="text-marron-soft">{i + 1}.</span>
                        <span className="text-tinta font-bold">{result.answers[i] || ex.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="series"
                  data={{ problems: (result.series || []).map((s, i) => ({ statement: s.exercise, answer: s.answer, steps: [], difficulty: s.difficulty })) }}
                  title="Serie de ejercicios"
                  subtitle={`${result.topic || ''} · ${(result.series || []).length} ejercicios`}
                  moduleKey="matematicas"
                  filename={`series-mate-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => mutate()}>Regenerar serie</Button>
                <Button variant="ghost" onClick={() => setResult(null)}>Nueva serie</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
