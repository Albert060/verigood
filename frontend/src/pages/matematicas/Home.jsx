import { useNavigate } from 'react-router-dom';
import { PageHeader, StatCard, SectionLabel } from '../../components/ui';

const AGENTS = [
  { to: '/matematicas/problemas', roman: 'I', title: 'Generador de problemas', desc: 'Problemas de aritmética, geometría, álgebra y estadística con solución paso a paso. Adaptado al curso.' },
  { to: '/matematicas/corrector', roman: 'II', title: 'Corrector por foto', desc: 'Sube foto del trabajo del alumno → análisis de pasos, localización de errores y explicación de la solución.' },
  { to: '/matematicas/series', roman: 'III', title: 'Series y ejercicios', desc: 'Genera series de ejercicios de cálculo mental, fracciones, decimales, geometría o estadística.' },
];

const RECENT = [
  { title: 'Problemas 5ºA · Fracciones y decimales · 10 prob.', time: 'Hace 3h', type: 'problema' },
  { title: 'Corrección foto · Luis R. · División con decimales', time: 'Ayer', type: 'foto' },
  { title: 'Serie · Cálculo mental · 3ºB · 20 operaciones', time: 'Martes', type: 'serie' },
];

const TYPE_COLORS = { problema: '#2D4A6A', foto: '#6B1F2A', serie: '#1A5C35' };

export default function MatematicasHome() {
  const navigate = useNavigate();
  return (
    <div className="animate-slide-in">
      <PageHeader
        title={<>Matemáticas</>}
        subtitle="3 HERRAMIENTAS IA · PRIMARIA Y SECUNDARIA"
        romanNum="§ III"
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="PROBLEMAS GENERADOS" value={312} />
        <StatCard label="FOTOS CORREGIDAS" value={89} />
        <StatCard label="SERIES CREADAS" value={156} />
      </div>

      <SectionLabel className="mb-3">HERRAMIENTAS DISPONIBLES</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {AGENTS.map((ag) => (
          <button
            key={ag.to}
            onClick={() => navigate(ag.to)}
            className="bg-card-bg border border-linea shadow-card card-fold p-5 text-left hover:shadow-card-hover hover:-translate-y-px transition-all duration-250"
          >
            <div className="font-display italic text-[10px] text-[rgba(45,74,106,0.35)] mb-2">§ {ag.roman}</div>
            <div className="font-semibold text-[14px] text-tinta mb-1.5">{ag.title}</div>
            <p className="text-[12px] text-marron-soft leading-relaxed">{ag.desc}</p>
          </button>
        ))}
      </div>

      <SectionLabel className="mb-3">ACTIVIDAD RECIENTE</SectionLabel>
      <div className="bg-card-bg border border-linea shadow-card divide-y divide-[rgba(184,169,136,0.25)]">
        {RECENT.map((r, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: TYPE_COLORS[r.type] }} />
            <span className="flex-1 text-[12.5px] text-tinta">{r.title}</span>
            <span className="font-mono text-[10px] text-marron-soft">{r.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
