import { useNavigate } from 'react-router-dom';
import { PageHeader, StatCard, SectionLabel } from '../../components/ui';
import RecentActivityList from '../../components/ui/RecentActivityList';

const AGENTS = [
  { to: '/lengua/ejercicios', roman: 'I', title: 'Generador de ejercicios', desc: 'Dictado, comprensión lectora, redacción, ortografía, sintaxis, morfología. Adaptado al nivel y curso.' },
  { to: '/lengua/redaccion', roman: 'II', title: 'Corrector de redacción', desc: 'Pega el texto del alumno → corrección con categorías: ortografía, puntuación, coherencia, riqueza léxica.' },
  { to: '/lengua/sintaxis', roman: 'III', title: 'Análisis sintáctico', desc: 'Introduce una oración → análisis con árbol de constituyentes y etiquetado completo.' },
  { to: '/lengua/comentario', roman: 'IV', title: 'Comentario de texto', desc: 'Genera guía de comentario crítico para cualquier fragmento literario o periodístico.' },
  { to: '/lengua/dinamicas', roman: 'V', title: 'Dinámicas de clase', desc: 'Actividades de expresión oral, comprensión auditiva, debate, juego de roles.' },
];

export default function LenguaHome() {
  const navigate = useNavigate();
  return (
    <div className="animate-slide-in">
      <PageHeader
        title={<>Lengua / <em>Castellana</em></>}
        subtitle="5 HERRAMIENTAS IA · ED. PRIMARIA Y SECUNDARIA"
        romanNum="§ II"
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="EJERCICIOS GENERADOS" value={134} />
        <StatCard label="REDACCIONES CORREGIDAS" value={289} />
        <StatCard label="ANÁLISIS SINTÁCTICOS" value={67} />
        <StatCard label="COMENTARIOS" value={31} />
      </div>

      <SectionLabel className="mb-3">HERRAMIENTAS DISPONIBLES</SectionLabel>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {AGENTS.map((ag) => (
          <button
            key={ag.to}
            onClick={() => navigate(ag.to)}
            className="bg-card-bg border border-linea shadow-card card-fold p-5 text-left hover:shadow-card-hover hover:-translate-y-px transition-all duration-250"
          >
            <div className="font-display italic text-[10px] text-[rgba(107,31,42,0.35)] mb-2">§ {ag.roman}</div>
            <div className="font-semibold text-[14px] text-tinta mb-1.5">{ag.title}</div>
            <p className="text-[12px] text-marron-soft leading-relaxed">{ag.desc}</p>
          </button>
        ))}
      </div>

      <SectionLabel className="mb-3">ACTIVIDAD RECIENTE</SectionLabel>
      <RecentActivityList moduleFilter="espanol" limit={6} />
    </div>
  );
}
