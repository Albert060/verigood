import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { lenguaApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '4eso', label: '4º ESO' }, { value: '3eso', label: '3º ESO' },
  { value: '2eso', label: '2º ESO' }, { value: '6primaria', label: '6º P.' },
];

const TEXT_TYPES = [
  { value: 'literario', label: 'Literario' },
  { value: 'periodistico', label: 'Periodístico' },
  { value: 'expositivo', label: 'Expositivo' },
  { value: 'argumentativo', label: 'Argumentativo' },
];

const OUTPUT_MODES = [
  { value: 'guia', label: 'Guía de comentario' },
  { value: 'modelo', label: 'Comentario modelo' },
  { value: 'preguntas', label: 'Preguntas-guía' },
];

export default function TextCommentary() {
  const [text, setText] = useState('');
  const [form, setForm] = useState({
    course: ['4eso'],
    textType: ['literario'],
    outputMode: ['guia'],
  });
  const [result, setResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => lenguaApi.generateCommentary({
      text,
      course: form.course[0],
      textType: form.textType[0],
      outputMode: form.outputMode[0],
    }),
    onSuccess: (res) => setResult(res.data),
  });

  return (
    <div className="animate-slide-in">
      <PageHeader title="Comentario de texto" subtitle="LENGUA · ANÁLISIS LITERARIO Y PERIODÍSTICO" romanNum="§ II.IV" />

      <div className="grid grid-cols-2 gap-5">
        {/* Left */}
        <div>
          <div className="mb-4">
            <SectionLabel className="mb-2">FRAGMENTO DE TEXTO</SectionLabel>
            <textarea
              className="vg-textarea w-full h-48 text-[13px]"
              placeholder="Pega el fragmento literario, periodístico o expositivo que quieres comentar..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="font-mono text-[10px] text-marron-soft mt-1 text-right">
              {text.split(/\s+/).filter(Boolean).length} palabras
            </div>
          </div>

          <div className="mb-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="mb-4">
            <SectionLabel className="mb-2">TIPO DE TEXTO</SectionLabel>
            <TagCloud options={TEXT_TYPES} selected={form.textType} onChange={(v) => setForm((f) => ({ ...f, textType: v }))} multi={false} />
          </div>

          <div className="mb-5">
            <SectionLabel className="mb-2">MODALIDAD DE SALIDA</SectionLabel>
            <TagCloud options={OUTPUT_MODES} selected={form.outputMode} onChange={(v) => setForm((f) => ({ ...f, outputMode: v }))} multi={false} />
          </div>

          <Button
            className="w-full"
            loading={isPending}
            disabled={text.trim().length < 30}
            onClick={() => mutate()}
          >
            Generar comentario →
          </Button>
        </div>

        {/* Right */}
        <div>
          {!result && !isPending && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[40px] text-[rgba(184,169,136,0.3)] mb-2">§ IV</div>
                <p className="font-mono text-[11px] text-marron-soft">Introduce el fragmento y genera</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-granate border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Generando comentario...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Context strip */}
              <div className="bg-[rgba(184,169,136,0.1)] border border-linea p-3 flex gap-4 font-mono text-[11px]">
                <span>Tipo: <strong className="text-tinta">{form.textType[0]}</strong></span>
                <span>Modo: <strong className="text-tinta">{form.outputMode[0]}</strong></span>
                <span>Curso: <strong className="text-tinta">{form.course[0]}</strong></span>
              </div>

              {/* Sections */}
              {result.sections?.map((sec, i) => (
                <div key={i} className="bg-card-bg border border-linea shadow-card card-fold p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="font-display italic text-[16px] text-[rgba(107,31,42,0.4)]">{i + 1}.</div>
                    <div className="font-semibold text-[13px] text-tinta">{sec.title}</div>
                  </div>
                  <p className="text-[12px] text-marron-soft leading-relaxed">{sec.content}</p>

                  {sec.subpoints?.length > 0 && (
                    <div className="mt-2 space-y-1 pl-4 border-l border-linea">
                      {sec.subpoints.map((sp, j) => (
                        <p key={j} className="text-[11px] text-marron-soft">— {sp}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Questions mode */}
              {result.questions?.length > 0 && (
                <div className="bg-card-bg border border-linea shadow-card p-4">
                  <SectionLabel className="mb-2">PREGUNTAS-GUÍA</SectionLabel>
                  <div className="space-y-2">
                    {result.questions.map((q, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="font-mono text-[10px] text-marron-soft w-5 flex-shrink-0">{i + 1}.</span>
                        <p className="text-[12px] text-tinta">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vocabulary */}
              {result.keyVocabulary?.length > 0 && (
                <div className="bg-card-bg border border-linea shadow-card p-4">
                  <SectionLabel className="mb-2">VOCABULARIO CLAVE</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keyVocabulary.map((w) => (
                      <span key={w} className="font-mono text-[10px] text-marron-soft border border-linea px-1.5 py-0.5">{w}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="commentary"
                  data={result}
                  title="Guía de comentario de texto"
                  subtitle={`${form.course[0]} · ${form.textType[0]}`}
                  moduleKey="espanol"
                  filename={`comentario-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => { setResult(null); setText(''); }}>Nuevo comentario</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
