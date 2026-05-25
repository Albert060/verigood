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

const STEM_TYPES = [
  { value: 'experimento', label: 'Experimento' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'observacion', label: 'Observación' },
  { value: 'proyecto', label: 'Proyecto' },
];

const DURATIONS = [
  { value: '30min', label: '30 min' },
  { value: '1hora', label: '1 hora' },
  { value: 'sesion', label: '1 sesión' },
  { value: 'semana', label: '1 semana' },
];

const MATERIALS_BUDGET = [
  { value: 'sin_materiales', label: 'Sin materiales' },
  { value: 'bajo_coste', label: 'Bajo coste' },
  { value: 'laboratorio', label: 'Laboratorio' },
];

export default function STEMActivities() {
  const [form, setForm] = useState({
    course: ['4primaria'],
    type: ['experimento'],
    duration: ['1hora'],
    budget: ['bajo_coste'],
    topic: '',
  });
  const [result, setResult] = useState(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => medioApi.generateStemActivity({
      course: form.course[0],
      type: form.type[0],
      duration: form.duration[0],
      budget: form.budget[0],
      topic: form.topic,
    }),
    onSuccess: (res) => setResult(res.data),
  });

  const STEM_LABELS = Object.fromEntries(STEM_TYPES.map((t) => [t.value, t.label]));
  const TYPE_COLORS = { experimento: '#6B1F2A', investigacion: '#1F2A4D', construccion: '#7A5A1E', observacion: '#1A5C35', proyecto: '#2D4A6A' };

  return (
    <div className="animate-slide-in">
      <PageHeader title="Actividades STEM" subtitle="C. DEL MEDIO · CIENCIA EN ACCIÓN" romanNum="§ IV.III" />

      <div className="grid grid-cols-5 gap-5">
        {/* Config */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TIPO DE ACTIVIDAD</SectionLabel>
            <TagCloud options={STEM_TYPES} selected={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">DURACIÓN</SectionLabel>
            <TagCloud options={DURATIONS} selected={form.duration} onChange={(v) => setForm((f) => ({ ...f, duration: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">MATERIALES</SectionLabel>
            <TagCloud options={MATERIALS_BUDGET} selected={form.budget} onChange={(v) => setForm((f) => ({ ...f, budget: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TEMA (OPCIONAL)</SectionLabel>
            <input
              className="vg-input w-full"
              placeholder="Ej: plantas, agua, luz, magnetismo..."
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
          </div>

          <Button className="w-full" loading={isPending} onClick={() => mutate()}>
            Generar actividad →
          </Button>
        </div>

        {/* Result */}
        <div className="col-span-3">
          {!result && !isPending && (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="font-display italic text-[48px] text-[rgba(184,169,136,0.25)] mb-2">§ III</div>
                <p className="font-mono text-[11px] text-marron-soft">La actividad aparecerá aquí</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#1A5C35] border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Diseñando actividad STEM...</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Activity header */}
              <div className="bg-card-bg border border-linea p-4 card-fold">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="font-mono text-[9px] px-1.5 py-0.5 border"
                        style={{ color: TYPE_COLORS[result.type] || '#B8A988', borderColor: TYPE_COLORS[result.type] || '#B8A988' }}
                      >
                        {STEM_LABELS[result.type] || result.type}
                      </span>
                      {result.duration && (
                        <span className="font-mono text-[9px] text-marron-soft border border-linea px-1.5 py-0.5">{result.duration}</span>
                      )}
                      {result.ageGroup && (
                        <span className="font-mono text-[9px] text-marron-soft border border-linea px-1.5 py-0.5">{result.ageGroup}</span>
                      )}
                    </div>
                    <div className="font-semibold text-[15px] text-tinta">{result.title}</div>
                  </div>
                </div>
                <p className="text-[12px] text-marron-soft leading-relaxed">{result.description}</p>

                {/* Objectives */}
                {result.objectives?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(184,169,136,0.3)]">
                    <div className="font-mono text-[10px] text-marron-soft mb-1">OBJETIVOS</div>
                    <div className="space-y-0.5">
                      {result.objectives.map((obj, i) => (
                        <p key={i} className="text-[11px] text-marron-soft">— {obj}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Materials */}
              {result.materials?.length > 0 && (
                <div className="bg-card-bg border border-linea shadow-card p-4">
                  <SectionLabel className="mb-2">MATERIALES NECESARIOS</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {result.materials.map((m, i) => (
                      <span key={i} className="font-mono text-[10px] text-marron-soft border border-linea px-1.5 py-0.5">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps */}
              {result.steps?.length > 0 && (
                <div className="bg-card-bg border border-linea shadow-card p-4">
                  <SectionLabel className="mb-2">PASOS</SectionLabel>
                  <ol className="space-y-2">
                    {result.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="w-5 h-5 bg-[#1A5C35] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="font-mono text-[9px] text-papel font-bold">{i + 1}</span>
                        </div>
                        <p className="text-[12px] text-tinta">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Expected results */}
              {result.expectedResults && (
                <div className="bg-card-bg border border-linea shadow-card p-4">
                  <SectionLabel className="mb-2">RESULTADOS ESPERADOS</SectionLabel>
                  <p className="text-[12px] text-marron-soft leading-relaxed">{result.expectedResults}</p>
                </div>
              )}

              {/* Safety tips */}
              {result.safetyTips?.length > 0 && (
                <div className="bg-[rgba(230,183,28,0.08)] border border-amarillo p-4">
                  <SectionLabel className="mb-2 text-[#7A5A1E]">SEGURIDAD</SectionLabel>
                  <div className="space-y-1">
                    {result.safetyTips.map((tip, i) => (
                      <p key={i} className="text-[11px] text-[#7A5A1E]">⚠ {tip}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Curriculum connections */}
              {result.curriculumConnections?.length > 0 && (
                <div className="bg-card-bg border border-linea p-3">
                  <div className="font-mono text-[10px] text-marron-soft mb-1">CONEXIÓN CURRICULAR</div>
                  <div className="flex flex-wrap gap-1">
                    {result.curriculumConnections.map((c, i) => (
                      <span key={i} className="font-mono text-[9px] text-[#1A5C35] border border-[#1A5C35] px-1.5 py-0.5 bg-[rgba(26,92,53,0.05)]">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <DownloadPdfButton
                  type="dynamics"
                  data={{ dynamics: [result] }}
                  title={result.title || 'Actividad STEM'}
                  subtitle={`${result.duration || ''} · ${result.ageGroup || ''}`}
                  moduleKey="medio"
                  filename={`stem-${Date.now()}`}
                />
                <Button variant="ghost" onClick={() => { setResult(null); setForm((f) => ({ ...f, topic: '' })); }}>Nueva actividad</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
