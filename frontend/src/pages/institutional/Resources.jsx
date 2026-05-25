import { useState } from 'react';
import { PageHeader, SectionLabel, Badge, Button } from '../../components/ui';

const RESOURCES = [
  { id: 1, title: 'Examen B2 — Present Perfect vs Past Simple', type: 'exam', module: 'cambridge', teacher: 'Juan García', tags: ['B2', 'Grammar'], date: '2026-04-29' },
  { id: 2, title: 'Dinámica — The Job Interview · 15 min · B1', type: 'dynamic', module: 'cambridge', teacher: 'Ana Martín', tags: ['B1', 'Speaking'], date: '2026-04-28' },
  { id: 3, title: 'Dictado ortográfico — 4º Primaria · Uso de h', type: 'exercise', module: 'espanol', teacher: 'Carmen Ruiz', tags: ['Primaria 4', 'Ortografía'], date: '2026-04-27' },
  { id: 4, title: 'Problemas de geometría — 2º ESO · Polígonos', type: 'exam', module: 'matematicas', teacher: 'Luis Torres', tags: ['ESO 2', 'Geometría'], date: '2026-04-26' },
  { id: 5, title: 'Ficha temática — El Sistema Solar · 5º Primaria', type: 'sheet', module: 'medio', teacher: 'Ana Martín', tags: ['Primaria 5', 'Astronomía'], date: '2026-04-25' },
  { id: 6, title: 'Cuestionario FCE Reading Part 2 · B2', type: 'exam', module: 'cambridge', teacher: 'Juan García', tags: ['B2', 'FCE'], date: '2026-04-24' },
];

const TYPE_LABELS = { exam: 'Examen', dynamic: 'Dinámica', exercise: 'Ejercicio', sheet: 'Ficha' };
const MODULE_LABELS = { cambridge: 'Cambridge', espanol: 'Lengua', matematicas: 'Mates', medio: 'C.Medio' };
const MODULE_COLORS = { cambridge: '#1F2A4D', espanol: '#6B1F2A', matematicas: '#2D4A6A', medio: '#1A5C35' };

export default function InstitutionalResources() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? RESOURCES : RESOURCES.filter((r) => r.module === filter);

  return (
    <div className="animate-slide-in">
      <PageHeader title="Biblioteca" subtitle="RECURSOS COMPARTIDOS DEL CENTRO" romanNum="§ IV" />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        {['all', 'cambridge', 'espanol', 'matematicas', 'medio'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-mono text-[11px] px-3 py-1.5 border transition-all duration-150 ${
              filter === f
                ? 'bg-marino text-papel border-marino'
                : 'border-linea text-marron-soft hover:border-tinta hover:text-tinta'
            }`}
          >
            {f === 'all' ? 'TODOS' : MODULE_LABELS[f].toUpperCase()}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-marron-soft">{filtered.length} recursos</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((res) => (
          <div key={res.id} className="bg-card-bg border border-linea shadow-card card-fold p-4 flex items-start gap-4">
            <div
              className="w-0.5 h-10 flex-shrink-0 mt-1"
              style={{ background: MODULE_COLORS[res.module] }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[13px] text-tinta mb-1">{res.title}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] text-marron-soft">{TYPE_LABELS[res.type]}</span>
                <span className="text-marron-soft text-[10px]">·</span>
                <span className="font-mono text-[10px] text-marron-soft">{res.teacher}</span>
                <span className="text-marron-soft text-[10px]">·</span>
                <span className="font-mono text-[10px] text-marron-soft">
                  {new Date(res.date).toLocaleDateString('es')}
                </span>
                {res.tags.map((t) => (
                  <span key={t} className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">{t}</span>
                ))}
              </div>
            </div>
            <button className="font-mono text-[10px] text-marino hover:text-granate transition-colors flex-shrink-0">
              Descargar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
