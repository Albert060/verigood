import { PageHeader, SectionLabel, StatCard, ProgressBar } from '../../components/ui';

const TEACHER_STATS = [
  { name: 'Juan García', module: 'cambridge', exams: 34, corrections: 12, dynamics: 8 },
  { name: 'Ana Martín', module: 'cambridge', exams: 21, corrections: 28, dynamics: 5 },
  { name: 'Luis Torres', module: 'matematicas', exams: 8, corrections: 6, dynamics: 3 },
  { name: 'Carmen Ruiz', module: 'espanol', exams: 5, corrections: 18, dynamics: 2 },
  { name: 'María Pérez', module: 'cambridge', exams: 12, corrections: 9, dynamics: 4 },
];

const WEEKLY = [
  { label: 'Sem 1', value: 42 }, { label: 'Sem 2', value: 68 }, { label: 'Sem 3', value: 54 },
  { label: 'Sem 4', value: 81 },
];

const MODULE_BREAKDOWN = [
  { label: 'Cambridge', value: 168, pct: 63 },
  { label: 'Matemáticas', value: 74, pct: 42 },
  { label: 'Lengua', value: 48, pct: 28 },
  { label: 'C. del Medio', value: 27, pct: 15 },
];

export default function InstitutionalStats() {
  const max = Math.max(...WEEKLY.map((w) => w.value));
  return (
    <div className="animate-slide-in">
      <PageHeader title="Estadísticas" subtitle="USO DE LA PLATAFORMA · ABRIL 2026" romanNum="§ V" />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="GENERACIONES TOTALES" value={317} delta="+23% vs marzo" deltaUp />
        <StatCard label="HORAS AHORRADAS (EST.)" value="48 h" />
        <StatCard label="PROF. MÁS ACTIVO" value="J. García" mono={false} />
        <StatCard label="MÓDULO + USADO" value="Cambridge" mono={false} />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Weekly chart */}
        <div className="bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">USO SEMANAL — ABRIL</SectionLabel>
          <div className="flex items-end gap-3 h-20">
            {WEEKLY.map((w) => (
              <div key={w.label} className="flex flex-col items-center gap-1 flex-1">
                <span className="font-mono text-[9px] text-tinta">{w.value}</span>
                <div className="w-full bg-marino opacity-70" style={{ height: `${(w.value / max) * 48}px` }} />
                <span className="font-mono text-[9px] text-marron-soft">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module breakdown */}
        <div className="col-span-2 bg-card-bg border border-linea shadow-card card-fold p-4">
          <SectionLabel className="mb-3">USO POR MÓDULO</SectionLabel>
          <div className="space-y-3">
            {MODULE_BREAKDOWN.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-marron-soft w-24 flex-shrink-0">{m.label}</span>
                <ProgressBar value={m.pct} max={100} className="flex-1" />
                <span className="font-mono text-[11px] text-tinta w-12 text-right">{m.value} uses</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top teachers */}
      <div className="bg-card-bg border border-linea shadow-card">
        <div className="px-4 py-3 border-b border-linea">
          <SectionLabel className="mb-0">ACTIVIDAD POR PROFESOR</SectionLabel>
        </div>
        <table className="vg-table">
          <thead>
            <tr><th>PROFESOR</th><th>EXÁMENES</th><th>CORRECCIONES</th><th>DINÁMICAS</th><th>TOTAL</th></tr>
          </thead>
          <tbody>
            {TEACHER_STATS.sort((a, b) => (b.exams + b.corrections + b.dynamics) - (a.exams + a.corrections + a.dynamics)).map((t) => (
              <tr key={t.name}>
                <td className="font-medium text-tinta">{t.name}</td>
                <td className="font-mono text-[12px]">{t.exams}</td>
                <td className="font-mono text-[12px]">{t.corrections}</td>
                <td className="font-mono text-[12px]">{t.dynamics}</td>
                <td className="font-mono text-[13px] font-bold text-tinta">{t.exams + t.corrections + t.dynamics}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
