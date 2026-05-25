import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cambridgeApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const LEVELS = ['A1','A2','B1','B2','C1','C2'].map((l) => ({ value: l, label: l }));
const DURATIONS = [{ value: 5, label: '5 min' }, { value: 10, label: '10 min' }, { value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: 'Clase entera' }];
const TYPES = [
  { value: 'speaking', label: 'Speaking' }, { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' }, { value: 'reading', label: 'Reading' },
  { value: 'writing', label: 'Writing' }, { value: 'listening', label: 'Listening' },
  { value: 'warmup', label: 'Warm-up' }, { value: 'review', label: 'Review' },
];
const RESOURCES = [
  { value: 'projector', label: 'Proyector' }, { value: 'whiteboard', label: 'Pizarra' },
  { value: 'tablets', label: 'Tablets' }, { value: 'cards', label: 'Tarjetas' },
];

const TYPE_COLORS = { speaking: '#1F2A4D', vocabulary: '#2D4A6A', grammar: '#6B1F2A', reading: '#1A5C35', writing: '#7A5A1E', listening: '#3D3D3D', warmup: '#6B1F2A', review: '#1F2A4D' };

export default function DynamicsGenerator() {
  const [form, setForm] = useState({ level: ['B1'], duration: [15], types: ['speaking'], resources: [] });
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState([]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => cambridgeApi.generateDynamics({
      level: form.level[0],
      duration: form.duration[0],
      types: form.types,
      resources: form.resources,
      count: 3,
    }),
    onSuccess: (res) => setResults(res.data.dynamics || []),
  });

  return (
    <div className="animate-slide-in">
      <PageHeader title="Dinámicas de clase" subtitle="CAMBRIDGE · 8 TIPOS DE ACTIVIDAD" romanNum="§ I.III" />

      <div className="grid grid-cols-5 gap-5">
        {/* Config panel */}
        <div className="col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">NIVEL</SectionLabel>
            <TagCloud options={LEVELS} selected={form.level} onChange={(v) => setForm((f) => ({ ...f, level: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">DURACIÓN</SectionLabel>
            <TagCloud options={DURATIONS} selected={form.duration} onChange={(v) => setForm((f) => ({ ...f, duration: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TIPO DE ACTIVIDAD</SectionLabel>
            <TagCloud options={TYPES} selected={form.types} onChange={(v) => setForm((f) => ({ ...f, types: v }))} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">RECURSOS DISPONIBLES</SectionLabel>
            <TagCloud options={RESOURCES} selected={form.resources} onChange={(v) => setForm((f) => ({ ...f, resources: v }))} />
          </div>

          <Button className="w-full" loading={isPending} onClick={() => mutate()}>
            Proponer dinámicas →
          </Button>
        </div>

        {/* Results */}
        <div className="col-span-3">
          {results.length === 0 && !isPending && (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[11px] text-marron-soft">Configura y genera para ver propuestas</p>
            </div>
          )}

          {isPending && (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-marino border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-[11px] text-marron-soft">Generando dinámicas...</p>
            </div>
          )}

          <div className="space-y-3">
            {results.map((dyn, i) => (
              <div key={i} className="bg-card-bg border border-linea shadow-card card-fold p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[14px] text-tinta">{dyn.title}</span>
                      <span
                        className="font-mono text-[9px] px-1.5 py-0.5 border"
                        style={{ color: TYPE_COLORS[dyn.type] || '#B8A988', borderColor: TYPE_COLORS[dyn.type] || '#B8A988', background: `${TYPE_COLORS[dyn.type]}10` }}
                      >
                        {dyn.typeLabel || dyn.type}
                      </span>
                      <span className="font-mono text-[9px] text-marron-soft border border-linea px-1.5 py-0.5">
                        {dyn.duration} min
                      </span>
                    </div>
                    <p className="text-[12px] text-marron-soft leading-relaxed">{dyn.description}</p>
                  </div>
                  <button
                    onClick={() => setSaved((s) => [...s, i])}
                    className={`font-mono text-[10px] px-2 py-1 border flex-shrink-0 transition-colors ${
                      saved.includes(i) ? 'bg-[#EBF5EF] text-[#1A5C35] border-[#7DC49B]' : 'border-linea text-marron-soft hover:border-tinta'
                    }`}
                  >
                    {saved.includes(i) ? 'Guardado' : 'Guardar'}
                  </button>
                </div>

                {dyn.languageFocus?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dyn.languageFocus.map((f) => (
                      <span key={f} className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">{f}</span>
                    ))}
                  </div>
                )}

                {dyn.instructions?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(184,169,136,0.3)]">
                    <div className="font-mono text-[10px] text-marron-soft mb-1.5">INSTRUCCIONES</div>
                    <ol className="space-y-0.5">
                      {dyn.instructions.map((inst, j) => (
                        <li key={j} className="text-[11px] text-marron-soft flex gap-2">
                          <span className="font-mono text-[10px] text-marron-soft w-4 flex-shrink-0">{j + 1}.</span>
                          {inst}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <DownloadPdfButton
                type="dynamics"
                data={{ dynamics: results }}
                title={`Dinámicas Cambridge ${form.level[0]}`}
                subtitle={`${results.length} actividades · ${form.duration[0]} min`}
                moduleKey="cambridge"
                filename={`dinamicas-cambridge-${form.level[0]}-${Date.now()}`}
              />
              <Button variant="ghost" onClick={() => mutate()}>Regenerar propuestas</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
