import { useNavigate } from 'react-router-dom';
import { PageHeader, StatCard, SectionLabel } from '../../components/ui';

const AGENTS = [
  { to: '/medio/fichas', roman: 'I', title: 'Fichas temáticas', desc: 'Genera fichas completas sobre cualquier tema: cuerpo humano, ecosistemas, historia, geografía, ciencias...' },
  { to: '/medio/cuestionarios', roman: 'II', title: 'Cuestionarios automáticos', desc: 'Sube texto o tema → preguntas de comprensión, verdadero/falso y definiciones al instante.' },
  { to: '/medio/stem', roman: 'III', title: 'Actividades STEM', desc: 'Experimentos sencillos, proyectos de investigación y actividades de indagación adaptadas al curso.' },
];

const RECENT = [
  { title: 'Ficha · El sistema solar · 4ºA · 12 secciones', time: 'Hace 2h', type: 'ficha' },
  { title: 'Cuestionario · Los mamíferos · 3ºB · 15 preguntas', time: 'Ayer', type: 'cuestionario' },
  { title: 'Actividad STEM · Cultivo de semillas · 5ºC', time: 'Lunes', type: 'stem' },
];

const TYPE_COLORS = { ficha: '#1A5C35', cuestionario: '#2D4A6A', stem: '#7A5A1E' };

export default function MedioHome() {
  const navigate = useNavigate();
  return (
    <div className="animate-slide-in">
      <PageHeader
        title={<>C. del Medio / <em>Ciencias</em></>}
        subtitle="3 HERRAMIENTAS IA · 1º–6º PRIMARIA"
        romanNum="§ IV"
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="FICHAS GENERADAS" value={78} />
        <StatCard label="CUESTIONARIOS" value={143} />
        <StatCard label="ACTIVIDADES STEM" value={29} />
      </div>

      <SectionLabel className="mb-3">HERRAMIENTAS DISPONIBLES</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {AGENTS.map((ag) => (
          <button
            key={ag.to}
            onClick={() => navigate(ag.to)}
            className="bg-card-bg border border-linea shadow-card card-fold p-5 text-left hover:shadow-card-hover hover:-translate-y-px transition-all duration-250"
          >
            <div className="font-display italic text-[10px] text-[rgba(26,92,53,0.35)] mb-2">§ {ag.roman}</div>
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
