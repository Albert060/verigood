import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cambridgeApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const LEVELS = ['A1','A2','B1','B2','C1','C2'].map((l) => ({ value: l, label: l }));
const OUTPUT_TYPES = [
  { value: 'slides', label: 'Slides' },
  { value: 'summary', label: 'Resumen' },
  { value: 'notebooklm', label: 'NotebookLM' },
];
const SLIDE_COUNTS = [5, 8, 10, 12, 15].map((n) => ({ value: n, label: `${n} slides` }));

export default function PresentationGenerator() {
  const [sourceType, setSourceType] = useState('text'); // 'text' | 'pdf'
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ level: ['B1'], slideCount: [10], outputTypes: ['slides', 'notebooklm'] });
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('slides');
  const fileRef = useRef();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('level', form.level[0]);
      fd.append('slideCount', form.slideCount[0]);
      fd.append('outputTypes', JSON.stringify(form.outputTypes));
      if (sourceType === 'text') fd.append('text', text);
      else if (file) fd.append('pdf', file);
      return cambridgeApi.generatePresentation(fd);
    },
    onSuccess: (res) => {
      setResult(res.data);
      setActiveTab(form.outputTypes[0] || 'slides');
    },
  });

  const handleFile = (f) => { if (f) setFile(f); };
  const canGenerate = (sourceType === 'text' && text.trim().length > 20) || (sourceType === 'pdf' && file);

  const copyToClipboard = (txt) => navigator.clipboard.writeText(txt);

  return (
    <div className="animate-slide-in">
      <PageHeader title="Presentaciones" subtitle="CAMBRIDGE · SLIDES + NOTEBOOKLM" romanNum="§ I.IV" />

      <div className="grid grid-cols-5 gap-5">
        {/* Left panel — config */}
        <div className="col-span-2 space-y-4">
          {/* Source type toggle */}
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">FUENTE</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              {[{ v: 'text', l: 'Texto / tema' }, { v: 'pdf', l: 'PDF / doc' }].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setSourceType(v)}
                  className={`py-1.5 border font-mono text-[11px] transition-all duration-150 ${
                    sourceType === v ? 'bg-marino text-papel border-marino' : 'border-linea text-marron-soft hover:border-tinta bg-card-bg'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Source input */}
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">{sourceType === 'text' ? 'TEMA O TEXTO' : 'ARCHIVO PDF'}</SectionLabel>
            {sourceType === 'text' ? (
              <textarea
                className="vg-textarea w-full h-28 text-[12px]"
                placeholder="Ej: Unit 6 — The Environment. Present the vocabulary for climate change, pollution, recycling. Include B2 level discussion questions..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            ) : (
              <>
                {!file ? (
                  <div
                    className="upload-zone"
                    onClick={() => fileRef.current.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                  >
                    <div className="text-xl text-marron-soft mb-1">▥</div>
                    <div className="uz-title">Sube el PDF o documento</div>
                    <div className="uz-sub">PDF, DOC, DOCX · máx. 20 MB</div>
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 border border-linea bg-[rgba(184,169,136,0.08)]">
                    <span className="text-marron-soft">▥</span>
                    <span className="flex-1 text-[12px] text-tinta truncate">{file.name}</span>
                    <button onClick={() => setFile(null)} className="font-mono text-[10px] text-marron-soft hover:text-granate">✕</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Level */}
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">NIVEL</SectionLabel>
            <TagCloud options={LEVELS} selected={form.level} onChange={(v) => setForm((f) => ({ ...f, level: v }))} multi={false} />
          </div>

          {/* Slide count */}
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">NÚMERO DE SLIDES</SectionLabel>
            <TagCloud options={SLIDE_COUNTS} selected={form.slideCount} onChange={(v) => setForm((f) => ({ ...f, slideCount: v }))} multi={false} />
          </div>

          {/* Output types */}
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">SALIDAS A GENERAR</SectionLabel>
            <TagCloud options={OUTPUT_TYPES} selected={form.outputTypes} onChange={(v) => setForm((f) => ({ ...f, outputTypes: v }))} />
          </div>

          <Button className="w-full" loading={isPending} disabled={!canGenerate} onClick={() => mutate()}>
            Generar presentación →
          </Button>
        </div>

        {/* Right panel — results */}
        <div className="col-span-3">
          {!result && !isPending && (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[48px] text-[rgba(184,169,136,0.25)] mb-2">§ IV</div>
                <p className="font-mono text-[11px] text-marron-soft">El resultado aparecerá aquí</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-marino border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Estructurando presentación con IA...</p>
            </div>
          )}

          {result && (
            <div>
              {/* Tabs */}
              <div className="flex border-b border-linea mb-4">
                {OUTPUT_TYPES.filter((t) => form.outputTypes.includes(t.value)).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setActiveTab(t.value)}
                    className={`px-4 py-2 font-mono text-[11px] border-b-2 transition-colors ${
                      activeTab === t.value
                        ? 'border-marino text-marino'
                        : 'border-transparent text-marron-soft hover:text-tinta'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Slides tab */}
              {activeTab === 'slides' && result.slides && (
                <div className="space-y-2">
                  {result.slides.map((slide, i) => (
                    <div key={i} className="bg-card-bg border border-linea shadow-card card-fold p-4">
                      <div className="flex items-start gap-3">
                        <div className="font-display italic text-[18px] text-[rgba(31,42,77,0.25)] w-6 flex-shrink-0">{i + 1}</div>
                        <div className="flex-1">
                          <div className="font-semibold text-[13px] text-tinta mb-1">{slide.title}</div>
                          {slide.type && (
                            <span className="font-mono text-[9px] text-marron-soft border border-linea px-1.5 py-0.5 mr-2">{slide.type}</span>
                          )}
                          {slide.content && (
                            <p className="text-[11px] text-marron-soft leading-relaxed mt-1.5">{slide.content}</p>
                          )}
                          {slide.bullets?.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {slide.bullets.map((b, j) => (
                                <li key={j} className="text-[11px] text-marron-soft flex gap-2">
                                  <span className="text-[#B8A988]">—</span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {slide.speakerNote && (
                            <div className="mt-2 pt-2 border-t border-[rgba(184,169,136,0.3)]">
                              <span className="font-caveat text-[12px] text-[rgba(107,31,42,0.7)]">Nota: {slide.speakerNote}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => copyToClipboard(result.slides.map((s, i) => `[${i + 1}] ${s.title}\n${s.content || ''}\n${(s.bullets || []).join('\n')}`).join('\n\n'))}
                    className="w-full mt-2 font-mono text-[11px] text-marron-soft border border-linea py-2 hover:border-tinta hover:text-tinta transition-colors"
                  >
                    Copiar estructura →
                  </button>
                </div>
              )}

              {/* Summary tab */}
              {activeTab === 'summary' && result.summary && (
                <div className="bg-card-bg border border-linea shadow-card p-5">
                  <SectionLabel className="mb-3">RESUMEN</SectionLabel>
                  <div className="text-[13px] text-tinta leading-relaxed whitespace-pre-wrap">{result.summary}</div>
                  <button
                    onClick={() => copyToClipboard(result.summary)}
                    className="mt-4 font-mono text-[11px] text-marron-soft border border-linea px-3 py-1.5 hover:border-tinta hover:text-tinta transition-colors"
                  >
                    Copiar resumen →
                  </button>
                </div>
              )}

              {/* NotebookLM tab */}
              {activeTab === 'notebooklm' && result.notebooklmPrompt && (
                <div className="space-y-3">
                  <div className="bg-card-bg border border-linea shadow-card p-5">
                    <SectionLabel className="mb-2">PROMPT PARA NOTEBOOKLM</SectionLabel>
                    <p className="font-mono text-[10px] text-marron-soft mb-3">
                      Copia este prompt y pégalo en NotebookLM como primera fuente o instrucción de contexto.
                    </p>
                    <div className="bg-[rgba(31,42,77,0.04)] border border-linea p-3 font-mono text-[11px] text-tinta leading-relaxed whitespace-pre-wrap">
                      {result.notebooklmPrompt}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => copyToClipboard(result.notebooklmPrompt)}
                        className="font-mono text-[11px] text-marron-soft border border-linea px-3 py-1.5 hover:border-tinta hover:text-tinta transition-colors"
                      >
                        Copiar prompt →
                      </button>
                      <a
                        href="https://notebooklm.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-marino border border-marino px-3 py-1.5 hover:bg-[rgba(31,42,77,0.05)] transition-colors"
                      >
                        Abrir NotebookLM ↗
                      </a>
                    </div>
                  </div>

                  {result.suggestedQuestions?.length > 0 && (
                    <div className="bg-card-bg border border-linea shadow-card p-4">
                      <SectionLabel className="mb-2">PREGUNTAS SUGERIDAS PARA NOTEBOOKLM</SectionLabel>
                      <div className="space-y-1.5">
                        {result.suggestedQuestions.map((q, i) => (
                          <div key={i} className="flex gap-2 text-[12px]">
                            <span className="font-mono text-[10px] text-marron-soft w-4 flex-shrink-0">{i + 1}.</span>
                            <span className="text-marron-soft">{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="sheet"
                  data={{
                    title: result.title || 'Presentación',
                    level: form.level[0],
                    intro: result.summary,
                    sections: (result.slides || []).map((s, i) => ({
                      title: `${i + 1}. ${s.title || s.heading || 'Slide'}`,
                      body: s.content || s.speakerNote || '',
                      bullets: s.bullets || s.keyPoints || [],
                    })),
                  }}
                  title={result.title || 'Presentación'}
                  subtitle={`Cambridge ${form.level[0]} · ${(result.slides || []).length} slides`}
                  moduleKey="cambridge"
                  filename={`presentacion-${Date.now()}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
