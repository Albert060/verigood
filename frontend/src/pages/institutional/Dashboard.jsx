import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { orgApi } from '../../services/api';
import { StatCard, PageHeader, SectionLabel, ProgressBar } from '../../components/ui';

const MODULE_AGENTS = [
  { module: 'cambridge', label: 'Inglés', sublabel: 'Cambridge A1–C2', to: '/cambridge', color: '#1F2A4D', roman: 'I' },
  { module: 'espanol', label: 'Lengua', sublabel: 'Castellana', to: '/lengua', color: '#6B1F2A', roman: 'II' },
  { module: 'matematicas', label: 'Matemáticas', sublabel: 'Primaria–Bachillerato', to: '/matematicas', color: '#2D4A6A', roman: 'III' },
  { module: 'medio', label: 'C. del Medio', sublabel: 'Ciencias Naturales', to: '/medio', color: '#1A5C35', roman: 'IV' },
];

const ACTIVITY = [
  { user: 'Juan García', action: 'Generó examen B2 — Present Perfect', module: 'cambridge', time: 'Hace 2h' },
  { user: 'Ana Martín', action: 'Corrección OCR — 3ºB · 18/20', module: 'cambridge', time: 'Ayer' },
  { user: 'Luis Torres', action: 'Problemas álgebra 2º ESO · 8 ejercicios', module: 'matematicas', time: 'Ayer' },
  { user: 'María Pérez', action: 'Redacción corregida — 4ºA', module: 'espanol', time: 'Lun' },
  { user: 'Juan García', action: 'Dinámica — Debate B1 · 15 min', module: 'cambridge', time: 'Lun' },
];

const MODULE_COLORS = { cambridge: '#1F2A4D', espanol: '#6B1F2A', matematicas: '#2D4A6A', medio: '#1A5C35' };

export default function InstitutionalDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const activeModules = user?.activeModules || [];

  const { data: stats } = useQuery({
    queryKey: ['org-stats', user?.orgId],
    queryFn: () => orgApi.getStats(user.orgId).then((r) => r.data),
    enabled: !!user?.orgId,
  });

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={`Hola, ${user?.name?.split(' ')[0] || 'Profesor'}`}
        subtitle={`${user?.orgName?.toUpperCase()} · ${user?.plan?.toUpperCase() || 'PLAN COLEGIO'}`}
        romanNum="§ I"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard label="PROFESORES" value={stats?.users?.active_users ?? 12} />
        <StatCard label="EXÁMENES ESTE MES" value={stats?.usageByModule?.find(u => u.module === 'cambridge')?.count ?? 47} />
        <StatCard label="CORRECCIONES OCR" value={128} />
        <StatCard label="MÓDULOS ACTIVOS" value={activeModules.length} />
      </div>

      {/* Module tiles */}
      <SectionLabel className="mb-5">MÓDULOS DISPONIBLES</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {MODULE_AGENTS.filter((m) => activeModules.includes(m.module)).map((mod) => (
          <button
            key={mod.module}
            onClick={() => navigate(mod.to)}
            className="bg-card-bg border border-linea shadow-card rounded-2xl p-6 text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <div
              className="font-display italic text-[14px] mb-3"
              style={{ color: `${mod.color}66` }}
            >
              § {mod.roman}
            </div>
            <div className="text-[18px] font-semibold text-tinta mb-1">{mod.label}</div>
            <div className="font-mono text-[12px] text-marron-soft">{mod.sublabel}</div>
            <div className="mt-4 h-1 w-12 rounded-full" style={{ background: mod.color, opacity: 0.5 }} />
          </button>
        ))}
      </div>

      {/* Usage + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage by module */}
        <div className="bg-card-bg border border-linea shadow-card rounded-2xl p-6">
          <SectionLabel className="mb-5">USO POR MÓDULO — ESTE MES</SectionLabel>
          <div className="space-y-5">
            {[
              { label: 'Cambridge', value: 63, max: 100 },
              { label: 'Lengua', value: 28, max: 100 },
              { label: 'Matemáticas', value: 42, max: 100 },
              { label: 'C. del Medio', value: 15, max: 100 },
            ].filter((m) => activeModules.some((am) => m.label.toLowerCase().includes(am.replace('espanol','lengua').replace('medio','medio')))).map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="font-mono text-[13px] text-marron-soft w-28 flex-shrink-0 font-medium">{item.label}</span>
                <ProgressBar value={item.value} max={item.max} className="flex-1" />
                <span className="font-mono text-[14px] text-tinta w-10 text-right font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-card-bg border border-linea shadow-card rounded-2xl p-6">
          <SectionLabel className="mb-5">ACTIVIDAD RECIENTE</SectionLabel>
          <div className="space-y-0">
            {ACTIVITY.map((act, i) => (
              <div key={i} className="flex items-start gap-4 py-4 border-b border-[rgba(184,169,136,0.3)] last:border-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2"
                  style={{ background: MODULE_COLORS[act.module] || '#B8A988' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-tinta leading-snug mb-1">{act.action}</p>
                  <p className="font-mono text-[12px] text-marron-soft">{act.user}</p>
                </div>
                <span className="font-mono text-[12px] text-marron-soft flex-shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
