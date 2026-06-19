import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { orgApi } from '../../services/api';
import { PageHeader, StatCard, SectionLabel } from '../../components/ui';
import RecentActivityList from '../../components/ui/RecentActivityList';

const AGENTS = [
  { to: '/cambridge/exams/new', roman: 'I', title: 'Generador de exámenes', desc: 'A1–C2 · Múltiple choice, cloze, word formation, key word transformation. Híbrido BD + IA.' },
  { to: '/cambridge/ocr', roman: 'II', title: 'Corrector OCR', desc: 'Sube foto del examen manuscrito → corrección con puntuación, errores y feedback individualizado.' },
  { to: '/cambridge/dynamics', roman: 'III', title: 'Dinámicas de clase', desc: '8 tipos: vocabulary, speaking, reading, writing, listening, grammar, warmup, review.' },
  { to: '/cambridge/presentations', roman: 'IV', title: 'Presentaciones', desc: 'Sube un PDF o pega texto → estructura de slides + prompt para NotebookLM.' },
];

export default function CambridgeHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const orgId = user?.orgId || user?.organization_id;

  // Stats reales del centro — el endpoint devuelve usageByModule agregado
  // desde usage_logs. Aquí filtramos por module === 'cambridge' para los KPIs.
  // La lista de actividad reciente se delega a RecentActivityList.
  const { data: stats } = useQuery({
    queryKey: ['org-stats', orgId],
    queryFn: () => orgApi.getStats(orgId).then((r) => r.data),
    enabled: !!orgId,
    refetchInterval: 60_000,
  });

  const cambridgeUsage = useMemo(() => {
    const items = (stats?.usageByModule || []).filter((u) => u.module === 'cambridge');
    const byAction = (key) => Number(items.find((i) => i.action_type === key)?.count || 0);
    return {
      exams:        byAction('exam_generate') + byAction('exam_save'),
      ocr:          byAction('ocr_correct'),
      dynamics:     byAction('dynamics_generate'),
      presentations: byAction('presentation_generate'),
    };
  }, [stats]);

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={<>Inglés / <em>Cambridge</em></>}
        subtitle="4 AGENTES IA · A1–C2 · CERTIFICACIONES CAMBRIDGE"
        romanNum="§ I"
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="EXÁMENES GENERADOS" value={cambridgeUsage.exams} />
        <StatCard label="CORRECCIONES OCR" value={cambridgeUsage.ocr} />
        <StatCard label="DINÁMICAS" value={cambridgeUsage.dynamics} />
        <StatCard label="PRESENTACIONES" value={cambridgeUsage.presentations} />
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
      <RecentActivityList moduleFilter="cambridge" limit={6} />
    </div>
  );
}
