import { useNavigate } from 'react-router-dom';
import { PageHeader, StatCard, SectionLabel } from '../../components/ui';

const AGENTS = [
  { to: '/lengua/ejercicios', roman: 'I', title: 'Generador de ejercicios', desc: 'Dictado, comprensión lectora, redacción, ortografía, sintaxis, morfología. Adaptado al nivel y curso.' },
  { to: '/lengua/redaccion', roman: 'II', title: 'Corrector de redacción', desc: 'Pega el texto del alumno → corrección con categorías: ortografía, puntuación, coherencia, riqueza léxica.' },
  { to: '/lengua/sintaxis', roman: 'III', title: 'Análisis sintáctico', desc: 'Introduce una oración → análisis con árbol de constituyentes y etiquetado completo.' },
  { to: '/lengua/comentario', roman: 'IV', title: 'Comentario de texto', desc: 'Genera guía de comentario crítico para cualquier fragmento literario o periodístico.' },
  { to: '/lengua/dinamicas', roman: 'V', title: 'Dinámicas de clase', desc: 'Actividades de expresión oral, comprensión auditiva, debate, juego de roles.' },
];

const RECENT = [
  { title: 'Dictado 5ºA · Acentuación diacrítica · 22 alumnos', time: 'Hace 1h', type: 'dictado' },
  { title: 'Redacción corregida · Ana M. · Tema libre · 7.5/10', time: 'Ayer', type: 'redaccion' },
  { title: 'Análisis sintáctico · "El libro era muy antiguo"', time: 'Martes', type: 'sintaxis' },
  { title: 'Comentario · Fragmento Lazarillo de Tormes · 6ºB', time: 'Lunes', type: 'comentario' },
];

const TYPE_COLORS = { dictado: '#6B1F2A', redaccion: '#1F2A4D', sintaxis: '#2D4A6A', comentario: '#1A5C35' };

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
