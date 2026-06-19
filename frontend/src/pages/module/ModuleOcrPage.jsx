import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useOutletContext, Navigate } from 'react-router-dom';
import { moduleOcrApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel, ProgressBar, Card } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

// Corrector OCR genérico para asignaturas. Se monta como sub-ruta del ModuleLayout
// y se autoconfigura llamando a GET /api/modules/:moduleId/ocr/config.
// Si el módulo no tiene OCR habilitado, redirige a la home del módulo.
export default function ModuleOcrPage() {
  const { moduleId, mod } = useOutletContext();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ course: '', focus: '', feedbackMode: 'full' });
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const { data: cfg, isLoading: loadingCfg } = useQuery({
    queryKey: ['module-ocr-config', moduleId],
    queryFn: () => moduleOcrApi.getConfig(moduleId).then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('examImage', file);
      if (form.course) fd.append('course', form.course);
      if (form.focus)  fd.append('focus', form.focus);
      fd.append('feedbackMode', form.feedbackMode);
      return moduleOcrApi.correct(moduleId, fd);
    },
    onSuccess: (res) => setResult(res.data),
  });

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  if (loadingCfg) {
    return (
      <div className="font-mono text-[11px] text-marron-soft">Cargando corrector…</div>
    );
  }

  if (!cfg?.enabled) {
    return <Navigate to={mod?.route_prefix || '/dashboard'} replace />;
  }

  const pct = result ? Math.round((result.totalScore / result.maxScore) * 100) : 0;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Corrector OCR"
        subtitle={`${cfg.label.toUpperCase()} · SUBE UNA FOTO · CORRECCIÓN AUTOMÁTICA`}
        romanNum="§ I.II"
      />

      <div className="grid grid-cols-2 gap-5">
        {/* Left panel — config */}
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
                onClick={() => { setFile(null); setPreview(null); setResult(null); }}
                className="absolute top-2 right-2 bg-papel border border-linea px-2 py-0.5 font-mono text-[10px] text-marron-soft hover:text-granate"
              >
                Cambiar
              </button>
            </div>
          )}

          <div className="mb-4">
            <SectionLabel className="mb-2">{(cfg.levelLabel || 'CURSO').toUpperCase()}</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {(cfg.levels || []).map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, course: c }))}
                  className={`py-1.5 border font-mono text-[11px] transition-all duration-150 ${
                    form.course === c ? 'bg-marino text-papel border-marino' : 'border-linea text-marron-soft hover:border-tinta bg-card-bg'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {(cfg.focusOptions || []).length > 0 && (
            <div className="mb-4">
              <SectionLabel className="mb-2">FOCO DE CORRECCIÓN</SectionLabel>
              <TagCloud
                options={(cfg.focusOptions || []).map((o) => ({ value: o, label: o }))}
                selected={form.focus ? [form.focus] : []}
                onChange={([v]) => setForm((f) => ({ ...f, focus: v || '' }))}
                multi={false}
              />
            </div>
          )}

          <div className="mb-5">
            <SectionLabel className="mb-2">NIVEL DE FEEDBACK</SectionLabel>
            <TagCloud
              options={cfg.feedbackModes}
              selected={[form.feedbackMode]}
              onChange={([v]) => setForm((f) => ({ ...f, feedbackMode: v }))}
              multi={false}
            />
          </div>

          <Button
            className="w-full"
            loading={isPending}
            disabled={!file || !form.course}
            onClick={() => mutate()}
          >
            Corregir prueba →
          </Button>
        </div>

        {/* Right panel — result */}
        <div>
          {!result && !isPending && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[40px] text-[rgba(184,169,136,0.3)] mb-2">§ II</div>
                <p className="font-mono text-[11px] text-marron-soft">El resultado aparecerá aquí</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-marino border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Procesando OCR y corrigiendo...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <Card className="p-4 flex items-start justify-between">
                <div>
                  <SectionLabel className="mb-1">{result.subjectLabel || cfg.label} · {result.course || form.course}</SectionLabel>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-[32px] text-tinta">{result.totalScore}</span>
                    <span className="font-mono text-[14px] text-marron-soft">/ {result.maxScore}</span>
                  </div>
                  <ProgressBar value={result.totalScore} max={result.maxScore} className="w-32 mt-1" />
                </div>
                <div className="score-stamp text-[22px]">
                  {result.grade || (pct >= 50 ? 'APTO' : 'NO APTO')}
                </div>
              </Card>

              {(result.questions || []).length > 0 && (
                <Card className="p-4">
                  <SectionLabel className="mb-2">RESPUESTAS</SectionLabel>
                  <div className="space-y-1.5">
                    {(result.questions || []).map((q) => (
                      <div key={q.number} className="flex items-center gap-2 text-[12px]">
                        <span className={`w-5 h-5 border flex items-center justify-center font-mono text-[10px] flex-shrink-0 ${
                          q.isCorrect ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]' : 'bg-[#FCF0F0] text-granate border-[#D4878A]'
                        }`}>{q.number}</span>
                        <span className="flex-1 text-tinta truncate">{q.question || `Pregunta ${q.number}`}</span>
                        <span className="font-mono text-[11px] text-marron-soft truncate max-w-[120px]">{q.studentAnswer}</span>
                        {!q.isCorrect && q.correctAnswer && (
                          <span className="font-caveat text-[13px] text-granate truncate max-w-[140px]">→ {q.correctAnswer}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {result.overallFeedback && (
                <Card className="p-4">
                  <SectionLabel className="mb-2">FEEDBACK GLOBAL</SectionLabel>
                  <p className="text-[12px] text-tinta/90 leading-relaxed">{result.overallFeedback}</p>
                </Card>
              )}

              {(result.studyRecommendations || []).length > 0 && (
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

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="ocr"
                  data={result}
                  title={`Corrección ${cfg.label} ${result.course || ''}`.trim()}
                  subtitle={`Puntuación ${result.totalScore}/${result.maxScore}`}
                  moduleKey={moduleId}
                  filename={`correccion-${moduleId}-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => { setResult(null); setFile(null); setPreview(null); }}>
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
