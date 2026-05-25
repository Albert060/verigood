import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { matematicasApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '2primaria', label: '2º P.' }, { value: '3primaria', label: '3º P.' },
  { value: '4primaria', label: '4º P.' }, { value: '5primaria', label: '5º P.' },
  { value: '6primaria', label: '6º P.' }, { value: '1eso', label: '1º ESO' },
  { value: '2eso', label: '2º ESO' },
];

const FEEDBACK_MODES = [
  { value: 'full', label: 'Completo' },
  { value: 'brief', label: 'Breve' },
];

export default function PhotoCorrector() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ course: ['5primaria'], feedbackMode: ['full'] });
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('mathImage', file);
      fd.append('course', form.course[0]);
      fd.append('feedbackMode', form.feedbackMode[0]);
      return matematicasApi.correctPhoto(fd);
    },
    onSuccess: (res) => setResult(res.data),
  });

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  return (
    <div className="animate-slide-in">
      <PageHeader title="Corrector por foto" subtitle="MATEMÁTICAS · OCR + ANÁLISIS DE PASOS" romanNum="§ III.II" />

      <div className="grid grid-cols-2 gap-5">
        {/* Left — input */}
        <div>
          {!file ? (
            <div
              className="upload-zone mb-4"
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
              <div className="text-2xl text-marron-soft mb-2">◉</div>
              <div className="uz-title">Sube foto del ejercicio</div>
              <div className="uz-sub">JPG, PNG, WebP · máx. 10 MB</div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="border border-linea mb-4 relative">
              <img src={preview} alt="preview" className="w-full max-h-64 object-contain bg-[rgba(184,169,136,0.05)]" />
              <button
                onClick={() => { setFile(null); setPreview(null); setResult(null); }}
                className="absolute top-2 right-2 bg-papel border border-linea px-2 py-0.5 font-mono text-[10px] text-marron-soft hover:text-granate"
              >
                Cambiar
              </button>
            </div>
          )}

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
            disabled={!file}
            onClick={() => mutate()}
          >
            Corregir ejercicio →
          </Button>
        </div>

        {/* Right — result */}
        <div>
          {!result && !isPending && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[40px] text-[rgba(184,169,136,0.3)] mb-2">§ II</div>
                <p className="font-mono text-[11px] text-marron-soft">El análisis aparecerá aquí</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#2D4A6A] border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Procesando imagen y analizando...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Overall verdict */}
              <div className="bg-card-bg border border-linea p-4 card-fold flex items-start justify-between">
                <div>
                  <SectionLabel className="mb-1">RESULTADO</SectionLabel>
                  <p className="text-[13px] text-tinta">{result.problemStatement || 'Ejercicio analizado'}</p>
                  {result.isCorrect !== undefined && (
                    <div className={`mt-2 font-mono text-[11px] px-2 py-1 border inline-block ${
                      result.isCorrect
                        ? 'text-[#1A5C35] border-[#7DC49B] bg-[#EBF5EF]'
                        : 'text-granate border-granate bg-[rgba(107,31,42,0.05)]'
                    }`}>
                      {result.isCorrect ? 'CORRECTO' : 'INCORRECTO'}
                    </div>
                  )}
                </div>
                {result.score !== undefined && (
                  <div className="score-stamp text-[20px]">
                    {result.score}/{result.maxScore || 10}
                  </div>
                )}
              </div>

              {/* Detected work */}
              {result.detectedWork && (
                <div className="bg-card-bg border border-linea p-4 card-fold">
                  <SectionLabel className="mb-2">TRABAJO DETECTADO</SectionLabel>
                  <div className="font-mono text-[12px] text-tinta whitespace-pre-wrap bg-[rgba(45,74,106,0.04)] p-3 border border-linea">
                    {result.detectedWork}
                  </div>
                </div>
              )}

              {/* Steps analysis */}
              {result.steps?.length > 0 && (
                <div className="bg-card-bg border border-linea p-4 card-fold">
                  <SectionLabel className="mb-2">ANÁLISIS POR PASOS</SectionLabel>
                  <div className="space-y-2">
                    {result.steps.map((step, i) => (
                      <div key={i} className={`flex gap-3 p-2 border-l-2 ${
                        step.correct ? 'border-[#7DC49B] bg-[rgba(45,163,100,0.03)]' : 'border-granate bg-[rgba(107,31,42,0.03)]'
                      }`}>
                        <span className={`font-mono text-[10px] mt-0.5 ${step.correct ? 'text-[#1A5C35]' : 'text-granate'}`}>
                          {step.correct ? '✓' : '✗'}
                        </span>
                        <div className="flex-1">
                          <p className="text-[12px] text-tinta">{step.description}</p>
                          {!step.correct && step.correction && (
                            <p className="font-caveat text-[13px] text-granate mt-0.5">→ {step.correction}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct solution */}
              {result.correctSolution && (
                <div className="bg-card-bg border border-linea p-4 card-fold">
                  <SectionLabel className="mb-2">SOLUCIÓN CORRECTA</SectionLabel>
                  <div className="space-y-1">
                    {Array.isArray(result.correctSolution) ? (
                      result.correctSolution.map((s, i) => (
                        <p key={i} className="text-[12px] text-tinta">{i + 1}. {s}</p>
                      ))
                    ) : (
                      <p className="text-[12px] text-tinta">{result.correctSolution}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {result.feedback && (
                <div className="bg-card-bg border border-linea p-4 card-fold">
                  <SectionLabel className="mb-2">FEEDBACK</SectionLabel>
                  <p className="text-[12px] text-marron-soft leading-relaxed">{result.feedback}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="feedback"
                  data={result}
                  title="Corrección de trabajo"
                  subtitle={`Puntuación ${result.totalScore}/${result.maxScore}`}
                  moduleKey="matematicas"
                  filename={`correccion-mate-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => { setResult(null); setFile(null); setPreview(null); }}>Nueva corrección</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
