import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cambridgeApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel, ProgressBar } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const CERTIFICATIONS = ['KET A2', 'PET B1', 'FCE B2', 'CAE C1', 'CPE C2'];
const FEEDBACK_MODES = [
  { value: 'full', label: 'Completo' },
  { value: 'score_only', label: 'Solo nota' },
  { value: 'brief', label: 'Breve' },
];

export default function OcrCorrector() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ certification: 'PET B1', feedbackMode: 'full' });
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const [cert, level] = form.certification.split(' ');
      const fd = new FormData();
      fd.append('examImage', file);
      fd.append('certification', cert);
      fd.append('level', level);
      fd.append('feedbackMode', form.feedbackMode);
      return cambridgeApi.correctOcr(fd);
    },
    onSuccess: (res) => setResult(res.data),
  });

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const pct = result ? Math.round((result.totalScore / result.maxScore) * 100) : 0;

  return (
    <div className="animate-slide-in">
      <PageHeader title="Corrector OCR" subtitle="SUBE UNA FOTO · CORRECCIÓN AUTOMÁTICA" romanNum="§ I.II" />

      <div className="grid grid-cols-2 gap-5">
        {/* Left panel — config */}
        <div>
          {/* Upload zone */}
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
            <SectionLabel className="mb-2">CERTIFICACIÓN</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {CERTIFICATIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, certification: c }))}
                  className={`py-1.5 border font-mono text-[11px] transition-all duration-150 ${
                    form.certification === c ? 'bg-marino text-papel border-marino' : 'border-linea text-marron-soft hover:border-tinta bg-card-bg'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <SectionLabel className="mb-2">NIVEL DE FEEDBACK</SectionLabel>
            <TagCloud
              options={FEEDBACK_MODES}
              selected={[form.feedbackMode]}
              onChange={([v]) => setForm((f) => ({ ...f, feedbackMode: v }))}
              multi={false}
            />
          </div>

          <Button
            className="w-full"
            loading={isPending}
            disabled={!file}
            onClick={() => mutate()}
          >
            Corregir examen →
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
              {/* Score stamp */}
              <div className="bg-card-bg border border-linea p-4 card-fold flex items-start justify-between">
                <div>
                  <SectionLabel className="mb-1">{result.certification} {result.level}</SectionLabel>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-[32px] text-tinta">{result.totalScore}</span>
                    <span className="font-mono text-[14px] text-marron-soft">/ {result.maxScore}</span>
                  </div>
                  <ProgressBar value={result.totalScore} max={result.maxScore} className="w-32 mt-1" />
                </div>
                <div className="score-stamp text-[22px]">
                  {result.grade || (pct >= 70 ? 'PASS' : 'FAIL')}
                </div>
              </div>

              {/* Per-question */}
              <div className="bg-card-bg border border-linea p-4 card-fold">
                <SectionLabel className="mb-2">RESPUESTAS</SectionLabel>
                <div className="space-y-1.5">
                  {(result.questions || []).map((q) => (
                    <div key={q.number} className="flex items-center gap-2 text-[12px]">
                      <span className={`w-5 h-5 border flex items-center justify-center font-mono text-[10px] flex-shrink-0 ${
                        q.isCorrect ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]' : 'bg-[#FCF0F0] text-granate border-[#D4878A]'
                      }`}>{q.number}</span>
                      <span className="flex-1 text-tinta truncate">{q.question || `Pregunta ${q.number}`}</span>
                      <span className="font-mono text-[11px] text-marron-soft">{q.studentAnswer}</span>
                      {!q.isCorrect && (
                        <span className="font-caveat text-[13px] text-granate">→ {q.correctAnswer}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback */}
              {result.studyRecommendations?.length > 0 && (
                <div className="bg-card-bg border border-linea p-4 card-fold">
                  <SectionLabel className="mb-2">RECOMENDACIONES</SectionLabel>
                  <div className="space-y-1.5">
                    {result.studyRecommendations.map((r, i) => (
                      <div key={i} className="flex gap-2 text-[12px]">
                        <span className="text-marron-soft font-mono">—</span>
                        <span className="text-marron-soft">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="ocr"
                  data={result}
                  title={`Corrección ${result.certification || ''} ${result.level || ''}`.trim()}
                  subtitle={`Puntuación ${result.totalScore}/${result.maxScore}`}
                  moduleKey="cambridge"
                  filename={`correccion-${result.certification || 'cambridge'}-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => setResult(null)}>Nueva corrección</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
