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

const AREAS = [
  { value: 'ciencias_naturales', label: 'Ciencias Nat.' },
  { value: 'ciencias_sociales', label: 'Ciencias Soc.' },
  { value: 'cuerpo_humano', label: 'Cuerpo humano' },
  { value: 'ecosistemas', label: 'Ecosistemas' },
  { value: 'historia', label: 'Historia' },
  { value: 'geografia', label: 'Geografía' },
  { value: 'salud', label: 'Salud' },
  { value: 'tecnologia', label: 'Tecnología' },
];

const FORMATS = [
  { value: 'completa', label: 'Completa' },
  { value: 'esquema', label: 'Esquema' },
  { value: 'resumen', label: 'Resumen' },
];

export default function ThematicSheets() {
  const [form, setForm] = useState({
    course: ['4primaria'],
    area: ['ciencias_naturales'],
    format: ['completa'],
    topic: '',
  });
  const [result, setResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => medioApi.generateSheet({
      course: form.course[0],
      area: form.area[0],
      format: form.format[0],
      topic: form.topic,
    }),
    onSuccess: (res) => setResult(res.data),
  });

  const SUGGESTED_TOPICS = {
    ciencias_naturales: ['Los animales vertebrados', 'El sistema solar', 'El ciclo del agua', 'Las plantas'],
    ciencias_sociales: ['Las comunidades autónomas', 'La Unión Europea', 'Los continentes'],
    cuerpo_humano: ['El aparato digestivo', 'El aparato circulatorio', 'Los sentidos'],
    ecosistemas: ['El bosque mediterráneo', 'La selva tropical', 'Los desiertos'],
    historia: ['La Prehistoria', 'El Imperio Romano', 'La Edad Media'],
    geografia: ['Los ríos de España', 'El relieve peninsular', 'Los climas'],
    salud: ['Alimentación saludable', 'Higiene personal', 'Primeros auxilios'],
    tecnologia: ['Las máquinas simples', 'La electricidad', 'El reciclaje'],
  };

  const suggestions = SUGGESTED_TOPICS[form.area[0]] || [];

  return (
    <div className="animate-slide-in">
      <PageHeader title="Fichas temáticas" subtitle="C. DEL MEDIO · GENERACIÓN AUTOMÁTICA" romanNum="§ IV.I" />

      <div className="grid grid-cols-5 gap-5">
        {/* Config */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">ÁREA</SectionLabel>
            <TagCloud options={AREAS} selected={form.area} onChange={(v) => setForm((f) => ({ ...f, area: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TEMA</SectionLabel>
            <input
              className="vg-input w-full mb-2"
              placeholder="Ej: El sistema solar, Los animales..."
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
            {suggestions.length > 0 && (
              <div>
                <div className="font-mono text-[9px] text-marron-soft mb-1">SUGERENCIAS</div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm((f) => ({ ...f, topic: s }))}
                      className="font-mono text-[9px] text-marron-soft border border-linea px-1.5 py-0.5 hover:border-[#1A5C35] hover:text-[#1A5C35] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">FORMATO</SectionLabel>
            <TagCloud options={FORMATS} selected={form.format} onChange={(v) => setForm((f) => ({ ...f, format: v }))} multi={false} />
          </div>

          <Button
            className="w-full"
            loading={isPending}
            disabled={!form.topic.trim()}
            onClick={() => mutate()}
          >
            Generar ficha →
          </Button>
        </div>

        {/* Result */}
        <div className="col-span-3">
          {!result && !isPending && (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[48px] text-[rgba(184,169,136,0.25)] mb-2">§ I</div>
                <p className="font-mono text-[11px] text-marron-soft">Selecciona tema y genera la ficha</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#1A5C35] border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Generando ficha temática...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Header */}
              <div className="bg-card-bg border border-linea p-4 card-fold">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-[16px] text-tinta mb-1">{result.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#1A5C35] border border-[#1A5C35] px-1.5 py-0.5">{result.area}</span>
                      <span className="font-mono text-[10px] text-marron-soft border border-linea px-1.5 py-0.5">{result.course}</span>
                    </div>
                  </div>
                  <div className="font-display italic text-[28px] text-[rgba(26,92,53,0.2)]">§</div>
                </div>
              </div>

              {/* Sections */}
              {result.sections?.map((sec, i) => (
                <div key={i} className="bg-card-bg border border-linea shadow-card card-fold p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-[#1A5C35] flex items-center justify-center">
                      <span className="font-mono text-[9px] text-papel font-bold">{i + 1}</span>
                    </div>
                    <div className="font-semibold text-[13px] text-tinta">{sec.title}</div>
                  </div>
                  <p className="text-[12px] text-marron-soft leading-relaxed">{sec.content}</p>

                  {sec.keyTerms?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sec.keyTerms.map((term) => (
                        <span key={term} className="font-mono text-[9px] text-[#1A5C35] border border-[#1A5C35] px-1.5 py-0.5 bg-[rgba(26,92,53,0.05)]">
                          {term}
                        </span>
                      ))}
                    </div>
                  )}

                  {sec.image_prompt && (
                    <div className="mt-2 border border-dashed border-linea px-3 py-2">
                      <span className="font-mono text-[9px] text-marron-soft">IMAGEN SUGERIDA: </span>
                      <span className="font-mono text-[9px] text-marron-soft italic">{sec.image_prompt}</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Activities */}
              {result.activities?.length > 0 && (
                <div className="bg-card-bg border border-linea shadow-card p-4">
                  <SectionLabel className="mb-2">ACTIVIDADES</SectionLabel>
                  <div className="space-y-2">
                    {result.activities.map((act, i) => (
                      <div key={i} className="flex gap-2 text-[12px]">
                        <span className="font-mono text-[10px] text-marron-soft w-5 flex-shrink-0">{i + 1}.</span>
                        <p className="text-tinta">{act}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="sheet"
                  data={result}
                  title={result.title || 'Ficha temática'}
                  subtitle={result.level}
                  moduleKey="medio"
                  filename={`ficha-medio-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => { setResult(null); setForm((f) => ({ ...f, topic: '' })); }}>Nueva ficha</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
