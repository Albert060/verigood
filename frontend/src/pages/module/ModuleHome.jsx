import { useNavigate, useOutletContext } from 'react-router-dom';
import { PageHeader, StatCard, SectionLabel } from '../../components/ui';

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
const toRoman = (i) => ROMAN[i] || String(i + 1);

const STAGE_LABEL = { primaria: 'PRIMARIA', eso: 'ESO', bachillerato: 'BACHILLERATO' };

// Landing del módulo — imita el layout de Cambridge Home:
//   1. PageHeader con título del módulo
//   2. 4 stat cards (placeholders hasta que conectemos usage_logs)
//   3. "HERRAMIENTAS DISPONIBLES" con grid de cards numeradas en romano
// Si el módulo tiene OCR habilitado, aparece como una herramienta más en la
// grid (no como card destacada aparte).
export default function ModuleHome() {
  const navigate = useNavigate();
  const { mod, tools, moduleId, ocrEnabled } = useOutletContext();
  const base = mod?.route_prefix || `#${moduleId}`;
  const stageLabel = STAGE_LABEL[mod?.stage] || '';

  // Compone la lista completa de "agentes" del módulo: tools del catálogo + OCR
  // si está habilitado. El OCR siempre va en segunda posición — igual que en
  // Cambridge — para que su localización sea predecible entre módulos.
  const ocrAgent = ocrEnabled
    ? {
        to: `${base}/ocr`,
        title: 'Corrector OCR',
        desc: 'Sube foto de la prueba del alumno → corrección con puntuación, errores y feedback individualizado.',
      }
    : null;

  const toolAgents = tools.map((t) => ({
    to: `${base}/${t.key}`,
    title: t.name,
    desc: t.description,
  }));

  const agents = ocrAgent
    ? [toolAgents[0], ocrAgent, ...toolAgents.slice(1)].filter(Boolean)
    : toolAgents;

  const subtitleParts = [
    `${agents.length} AGENTES IA`,
    stageLabel,
    mod?.category && mod.category.replace(/_/g, ' ').toUpperCase(),
  ].filter(Boolean);

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={mod?.name || 'Módulo'}
        subtitle={subtitleParts.join(' · ')}
        romanNum="§ I"
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="HERRAMIENTAS" value={agents.length} />
        <StatCard label="CORRECCIONES OCR" value={ocrEnabled ? 0 : '—'} />
        <StatCard label="EJECUCIONES" value={0} />
        <StatCard label="RECURSOS" value={0} />
      </div>

      <SectionLabel className="mb-3">HERRAMIENTAS DISPONIBLES</SectionLabel>

      {agents.length === 0 ? (
        <p className="font-mono text-[12px] text-marron-soft">
          Este módulo aún no tiene herramientas vinculadas.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {agents.map((ag, i) => (
            <button
              key={ag.to}
              onClick={() => navigate(ag.to)}
              className="bg-card-bg border border-linea shadow-card card-fold p-5 text-left hover:shadow-card-hover hover:-translate-y-px transition-all duration-250"
            >
              <div className="font-display italic text-[10px] text-[rgba(31,42,77,0.35)] mb-2">§ {toRoman(i)}</div>
              <div className="font-semibold text-[14px] text-tinta mb-1.5">{ag.title}</div>
              <p className="text-[12px] text-marron-soft leading-relaxed">{ag.desc}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
