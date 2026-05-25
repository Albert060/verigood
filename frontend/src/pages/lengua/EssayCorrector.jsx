import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { lenguaApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel, ProgressBar } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '3primaria', label: '3º P.' }, { value: '4primaria', label: '4º P.' },
  { value: '5primaria', label: '5º P.' }, { value: '6primaria', label: '6º P.' },
  { value: '1eso', label: '1º ESO' }, { value: '2eso', label: '2º ESO' },
  { value: '3eso', label: '3º ESO' }, { value: '4eso', label: '4º ESO' },
];

const FEEDBACK_MODES = [
  { value: 'full', label: 'Completo' },
  { value: 'brief', label: 'Breve' },
  { value: 'score_only', label: 'Solo nota' },
];

const CATEGORY_COLORS = {
  ortografia: '#6B1F2A',
  puntuacion: '#2D4A6A',
  coherencia: '#1A5C35',
  lexico: '#7A5A1E',
  estructura: '#3D3D3D',
};

const CATEGORY_LABELS = {
  ortografia: 'Ortografía',
  puntuacion: 'Puntuación',
  coherencia: 'Coherencia',
  lexico: 'Léxico',
  estructura: 'Estructura',
};

export default function EssayCorrector() {
  const [essay, setEssay] = useState('');
  const [form, setForm] = useState({ course: ['5primaria'], feedbackMode: ['full'] });
  const [result, setResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => lenguaApi.correctEssay({
      text: essay,
      course: form.course[0],
      feedbackMode: form.feedbackMode[0],
    }),
    onSuccess: (res) => setResult(res.data),
  });

  const globalScore = result ? Math.round((result.totalScore / result.maxScore) * 100) : 0;

  return (
    <div className="animate-slide-in">
      <PageHeader title="Corrector de redacción" subtitle="LENGUA · CORRECCIÓN CON IA" romanNum="§ II.II" />

      <div className="grid grid-cols-2 gap-5">
        {/* Left — input */}
        <div>
          <div className="mb-4">
            <SectionLabel className="mb-2">TEXTO DE LA REDACCIÓN</SectionLabel>
            <textarea
              className="vg-textarea w-full h-64 text-[13px]"
              placeholder="Pega aquí el texto del alumno o escríbelo manualmente..."
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
            />
            <div className="font-mono text-[10px] text-marron-soft mt-1 text-right">
              {essay.split(/\s+/).filter(Boolean).length} palabras
            </div>
          </div>

          <div className="mb-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="mb-5">
            <SectionLabel className="mb-2">NIVEL DE FEEDBACK</SectionLabel>
            <TagCloud options={FEEDBACK_MODES} selected={form.feedbackMode} onChange={(v) => setForm((f) => ({ ...f, feedbackMode: v }))} multi={false} />
          </div>

          <Button
            className="w-full"
            loading={isPending}
            disabled={essay.trim().length < 30}
            onClick={() => mutate()}
          >
            Corregir redacción →
          </Button>
        </div>

        {/* Right — result */}
        <div>
          {!result && !isPending && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[40px] text-[rgba(184,169,136,0.3)] mb-2">§ II</div>
                <p className="font-mono text-[11px] text-marron-soft">La corrección aparecerá aquí</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-granate border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Analizando redacción...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Score */}
              <div className="bg-card-bg border border-linea p-4 card-fold flex items-start justify-between">
                <div>
                  <SectionLabel className="mb-1">Puntuación global</SectionLabel>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-[32px] text-tinta">{result.totalScore}</span>
                    <span className="font-mono text-[14px] text-marron-soft">/ {result.maxScore}</span>
                  </div>
                  <ProgressBar value={result.totalScore} max={result.maxScore} className="w-32 mt-1" />
                </div>
                <div className="score-stamp text-[22px]">
                  {globalScore >= 90 ? 'SB' : globalScore >= 70 ? 'NT' : globalScore >= 50 ? 'AP' : 'INS'}
                </div>
              </div>

              {/* Categories */}
              {result.categories && (
                <div className="bg-card-bg border border-linea p-4 card-fold">
                  <SectionLabel className="mb-3">POR CATEGORÍAS</SectionLabel>
                  <div className="space-y-2">
                    {Object.entries(result.categories).map(([cat, data]) => (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="font-mono text-[10px]"
                            style={{ color: CATEGORY_COLORS[cat] || '#B8A988' }}
                          >
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                          <span className="font-mono text-[11px] text-tinta">
                            {data.score}/{data.max}
                          </span>
                        </div>
                        <div className="h-1 bg-linea bg-opacity-20 w-full">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${Math.round((data.score / data.max) * 100)}%`,
                              background: CATEGORY_COLORS[cat] || '#B8A988',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors?.length > 0 && (
                <div className="bg-card-bg border border-linea p-4 card-fold">
                  <SectionLabel className="mb-2">ERRORES DETECTADOS</SectionLabel>
                  <div className="space-y-2">
                    {result.errors.map((err, i) => (
                      <div key={i} className="border-l-2 border-granate pl-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="font-mono text-[9px] px-1 py-0.5 border"
                            style={{
                              color: CATEGORY_COLORS[err.category] || '#B8A988',
                              borderColor: CATEGORY_COLORS[err.category] || '#B8A988',
                            }}
                          >
                            {CATEGORY_LABELS[err.category] || err.category}
                          </span>
                        </div>
                        <p className="text-[12px] text-tinta">
                          <span className="line-through text-granate">{err.original}</span>
                          {' → '}
                          <span className="font-caveat text-[13px] text-[#1A5C35]">{err.corrected}</span>
                        </p>
                        {err.explanation && (
                          <p className="text-[11px] text-marron-soft mt-0.5">{err.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General feedback */}
              {result.generalFeedback && (
                <div className="bg-card-bg border border-linea p-4 card-fold">
                  <SectionLabel className="mb-2">VALORACIÓN GENERAL</SectionLabel>
                  <p className="text-[12px] text-marron-soft leading-relaxed">{result.generalFeedback}</p>
                </div>
              )}

              {/* Positive aspects */}
              {result.positiveAspects?.length > 0 && (
                <div className="bg-[#F0F8F2] border border-[#7DC49B] p-4">
                  <SectionLabel className="mb-2 text-[#1A5C35]">PUNTOS FUERTES</SectionLabel>
                  <div className="space-y-1">
                    {result.positiveAspects.map((p, i) => (
                      <div key={i} className="flex gap-2 text-[12px]">
                        <span className="text-[#1A5C35]">+</span>
                        <span className="text-[#1A5C35]">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="essay"
                  data={result}
                  title="Corrección de redacción"
                  subtitle={`${form.course[0]} · ${result.totalScore}/${result.maxScore}`}
                  moduleKey="espanol"
                  filename={`correccion-redaccion-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => { setResult(null); setEssay(''); }}>
                  Nueva corrección
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
