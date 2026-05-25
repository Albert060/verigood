import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { lenguaApi } from '../../services/api';
import { PageHeader, Button, TagCloud, SectionLabel } from '../../components/ui';
import DownloadPdfButton from '../../components/ui/DownloadPdfButton';

const COURSES = [
  { value: '3primaria', label: '3º P.' }, { value: '4primaria', label: '4º P.' },
  { value: '5primaria', label: '5º P.' }, { value: '6primaria', label: '6º P.' },
  { value: '1eso', label: '1º ESO' }, { value: '2eso', label: '2º ESO' },
  { value: '3eso', label: '3º ESO' }, { value: '4eso', label: '4º ESO' },
];

const DURATIONS = [5, 10, 15, 30].map((n) => ({ value: n, label: `${n} min` }));

const TYPES = [
  { value: 'expresion_oral', label: 'Expresión oral' },
  { value: 'comprension', label: 'Comprensión' },
  { value: 'debate', label: 'Debate' },
  { value: 'roles', label: 'Juego de roles' },
  { value: 'escritura_creativa', label: 'Escritura creativa' },
  { value: 'repaso', label: 'Repaso' },
  { value: 'warmup', label: 'Calentamiento' },
];

const TYPE_COLORS = {
  expresion_oral: '#1F2A4D', comprension: '#2D4A6A', debate: '#6B1F2A',
  roles: '#1A5C35', escritura_creativa: '#7A5A1E', repaso: '#3D3D3D', warmup: '#6B1F2A',
};

export default function LenguaDynamics() {
  const [form, setForm] = useState({ course: ['5primaria'], duration: [15], types: ['expresion_oral'], resources: [] });
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState([]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => lenguaApi.generateDynamics({
      course: form.course[0],
      duration: form.duration[0],
      types: form.types,
      count: 3,
    }),
    onSuccess: (res) => setResults(res.data.dynamics || []),
  });

  const TYPE_LABELS = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));

  return (
    <div className="animate-slide-in">
      <PageHeader title="Dinámicas de clase" subtitle="LENGUA · EXPRESIÓN · DEBATE · ESCRITURA" romanNum="§ II.V" />

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-2 space-y-4">
          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">CURSO</SectionLabel>
            <TagCloud options={COURSES} selected={form.course} onChange={(v) => setForm((f) => ({ ...f, course: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">DURACIÓN</SectionLabel>
            <TagCloud options={DURATIONS} selected={form.duration} onChange={(v) => setForm((f) => ({ ...f, duration: v }))} multi={false} />
          </div>

          <div className="bg-card-bg border border-linea shadow-card p-4">
            <SectionLabel className="mb-2">TIPO DE DINÁMICA</SectionLabel>
            <TagCloud options={TYPES} selected={form.types} onChange={(v) => setForm((f) => ({ ...f, types: v }))} />
          </div>

          <Button className="w-full" loading={isPending} onClick={() => mutate()}>
            Proponer dinámicas →
          </Button>
        </div>

        <div className="col-span-3">
          {results.length === 0 && !isPending && (
            <div className="h-48 flex items-center justify-center">
              <p className="font-mono text-[11px] text-marron-soft">Configura y genera para ver propuestas</p>
            </div>
          )}

          {isPending && (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-granate border-t-transparent rounded-full animate-spin" />
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
                        style={{ color: TYPE_COLORS[dyn.type] || '#B8A988', borderColor: TYPE_COLORS[dyn.type] || '#B8A988', background: `${TYPE_COLORS[dyn.type] || '#B8A988'}10` }}
                      >
                        {TYPE_LABELS[dyn.type] || dyn.type}
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

                {dyn.materials?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dyn.materials.map((m) => (
                      <span key={m} className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">{m}</span>
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
                title="Dinámicas de Lengua"
                subtitle={`${form.course[0]} · ${results.length} actividades`}
                moduleKey="espanol"
                filename={`dinamicas-lengua-${Date.now()}`}
              />
              <Button variant="ghost" onClick={() => mutate()}>Regenerar propuestas</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
