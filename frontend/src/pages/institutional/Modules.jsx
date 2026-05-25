import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { PageHeader, Toggle, Badge, SectionLabel, Button } from '../../components/ui';

const ALL_MODULES = [
  {
    id: 'cambridge', label: 'Inglés / Cambridge', description: 'Generador de exámenes A1–C2, corrector OCR, dinámicas y presentaciones.',
    agents: ['Generador exámenes', 'Corrector OCR', 'Dinámicas', 'Presentaciones'],
    usage: 63, color: '#1F2A4D',
  },
  {
    id: 'espanol', label: 'Lengua Castellana', description: 'Ejercicios, corrector de redacciones, análisis sintáctico y comentario de texto.',
    agents: ['Generador ejercicios', 'Corrector redacciones', 'Análisis sintáctico', 'Comentario texto'],
    usage: 28, color: '#6B1F2A',
  },
  {
    id: 'matematicas', label: 'Matemáticas', description: 'Problemas por nivel y tema, corrector de foto y series de ejercicios.',
    agents: ['Generador problemas', 'Corrector foto', 'Series ejercicios'],
    usage: 42, color: '#2D4A6A',
  },
  {
    id: 'medio', label: 'Conocimiento del Medio', description: 'Fichas temáticas, cuestionarios y dinámicas STEM para Primaria.',
    agents: ['Fichas temáticas', 'Cuestionarios', 'Dinámicas STEM'],
    usage: 15, color: '#1A5C35',
  },
  {
    id: 'oposiciones', label: 'Oposiciones', description: 'Temarios, simulacros y ejercicios para preparadores de oposiciones docentes.',
    agents: ['Temarios', 'Simulacros', 'Corrector respuestas'],
    usage: 0, color: '#7A5A1E', locked: true,
  },
];

export default function InstitutionalModules() {
  const { user, updateUser } = useAuthStore();
  const [active, setActive] = useState(user?.activeModules || ['cambridge', 'espanol', 'matematicas', 'medio']);
  const [saving, setSaving] = useState(false);

  const toggle = (id) => {
    if (id === 'cambridge') return; // Cambridge siempre activo
    setActive((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => { updateUser({ activeModules: active }); setSaving(false); }, 600);
  };

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Módulos"
        subtitle="ACTIVAR Y DESACTIVAR ASIGNATURAS"
        romanNum="§ III"
        actions={
          <Button loading={saving} onClick={handleSave}>Guardar cambios</Button>
        }
      />

      <div className="space-y-3">
        {ALL_MODULES.map((mod) => {
          const isOn = active.includes(mod.id);
          return (
            <div
              key={mod.id}
              className={`bg-card-bg border shadow-card card-fold p-5 transition-all duration-200 ${
                isOn ? 'border-linea' : 'border-[rgba(184,169,136,0.4)] opacity-60'
              } ${mod.locked ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {/* Color bar */}
                  <div className="w-0.5 h-12 flex-shrink-0 mt-1" style={{ background: mod.color, opacity: isOn ? 1 : 0.3 }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[14px] text-tinta">{mod.label}</span>
                      {mod.id === 'cambridge' && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">SIEMPRE ACTIVO</span>
                      )}
                      {mod.locked && (
                        <Badge variant="trial">PRÓXIMAMENTE</Badge>
                      )}
                    </div>
                    <p className="text-[12px] text-marron-soft mb-2">{mod.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.agents.map((a) => (
                        <span key={a} className="font-mono text-[9px] px-1.5 py-0.5 border border-linea text-marron-soft">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {isOn && (
                    <div className="text-right">
                      <div className="font-mono text-[10px] text-marron-soft mb-1">USO MES</div>
                      <div className="font-mono text-[14px] text-tinta">{mod.usage}</div>
                    </div>
                  )}
                  <Toggle on={isOn} onChange={() => toggle(mod.id)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-[rgba(232,216,154,0.15)] border border-amarillo p-3">
        <p className="font-mono text-[11px] text-[#7A5A1E]">
          Los módulos desactivados ocultan las herramientas a todos los profesores. El módulo Cambridge siempre permanece activo.
        </p>
      </div>
    </div>
  );
}
