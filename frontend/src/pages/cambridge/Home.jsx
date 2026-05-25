import { useNavigate } from 'react-router-dom';
import { PageHeader, StatCard, SectionLabel } from '../../components/ui';

const AGENTS = [
  { to: '/cambridge/exams/new', roman: 'I', title: 'Generador de exámenes', desc: 'A1–C2 · Múltiple choice, cloze, word formation, key word transformation. Híbrido BD + IA.' },
  { to: '/cambridge/ocr', roman: 'II', title: 'Corrector OCR', desc: 'Sube foto del examen manuscrito → corrección con puntuación, errores y feedback individualizado.' },
  { to: '/cambridge/dynamics', roman: 'III', title: 'Dinámicas de clase', desc: '8 tipos: vocabulary, speaking, reading, writing, listening, grammar, warmup, review.' },
  { to: '/cambridge/presentations', roman: 'IV', title: 'Presentaciones', desc: 'Sube un PDF o pega texto → estructura de slides + prompt para NotebookLM.' },
];

const RECENT = [
  { title: 'Examen B2 · Present Perfect vs Past Simple · 15 preg.', time: 'Hace 2h', type: 'exam' },
  { title: 'Corrección FCE Part 1 · Ana García 3ºB · 14/20', time: 'Ayer', type: 'ocr' },
  { title: 'Dinámica · Job Interview roleplay · B1 · 15 min', time: 'Lunes', type: 'dynamic' },
  { title: 'Presentación · Unit 5 Climate Change · B2', time: 'Viernes', type: 'pres' },
];

const TYPE_COLORS = { exam: '#1F2A4D', ocr: '#2D6A4F', dynamic: '#6B1F2A', pres: '#2D4A6A' };

export default function CambridgeHome() {
  const navigate = useNavigate();
  return (
    <div className="animate-slide-in">
      <PageHeader
        title={<>Inglés / <em>Cambridge</em></>}
        subtitle="4 AGENTES IA · A1–C2 · CERTIFICACIONES CAMBRIDGE"
        romanNum="§ I"
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="EXÁMENES GENERADOS" value={47} />
        <StatCard label="CORRECCIONES OCR" value={128} />
        <StatCard label="DINÁMICAS" value={23} />
        <StatCard label="PRESENTACIONES" value={11} />
      </div>

      <SectionLabel className="mb-3">HERRAMIENTAS DISPONIBLES</SectionLabel>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {AGENTS.map((ag) => (
          <button
            key={ag.to}
            onClick={() => navigate(ag.to)}
            className="bg-card-bg border border-linea shadow-card card-fold p-5 text-left hover:shadow-card-hover hover:-translate-y-px transition-all duration-250"
          >
            <div className="font-display italic text-[10px] text-[rgba(31,42,77,0.35)] mb-2">§ {ag.roman}</div>
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
