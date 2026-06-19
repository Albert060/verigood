import { useNavigate } from 'react-router-dom';
import { PageHeader, StatCard, SectionLabel } from '../../components/ui';
import RecentActivityList from '../../components/ui/RecentActivityList';

const AGENTS = [
  { to: '/medio/fichas', roman: 'I', title: 'Fichas temáticas', desc: 'Genera fichas completas sobre cualquier tema: cuerpo humano, ecosistemas, historia, geografía, ciencias...' },
  { to: '/medio/cuestionarios', roman: 'II', title: 'Cuestionarios automáticos', desc: 'Sube texto o tema → preguntas de comprensión, verdadero/falso y definiciones al instante.' },
  { to: '/medio/stem', roman: 'III', title: 'Actividades STEM', desc: 'Experimentos sencillos, proyectos de investigación y actividades de indagación adaptadas al curso.' },
];

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
      <RecentActivityList moduleFilter="medio" limit={6} />
    </div>
  );
}
