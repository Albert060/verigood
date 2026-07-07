import { useState } from 'react';
import { PageHeader, Toggle, SectionLabel, Button } from '../../components/ui';

const PLAN_LIMITS = [
  { plan: 'Starter', exams: 50, ocr: 100, dynamics: 50, users: 1 },
  { plan: 'Colegio', exams: 0, ocr: 0, dynamics: 0, users: 15 },
  { plan: 'Enterprise', exams: 0, ocr: 0, dynamics: 0, users: 0 },
];

export default function SuperadminSystem() {
  const [settings, setSettings] = useState({
    maintenance: false,
    registrations: true,
    aiHaiku: true,
    aiSonnet: true,
    ocrEnabled: true,
    emailNotifications: true,
  });
  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="animate-slide-in">
      <PageHeader title="Configuración del sistema" subtitle="PARÁMETROS GLOBALES" romanNum="§ IV" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Toggles */}
        <div className="bg-card-bg border border-linea shadow-card card-fold p-5">
          <SectionLabel className="mb-3">SERVICIOS</SectionLabel>
          <div className="space-y-0">
            {[
              { key: 'maintenance', label: 'Modo mantenimiento', desc: 'Bloquea el acceso a todos los usuarios' },
              { key: 'registrations', label: 'Nuevos registros', desc: 'Permite que los colegios creen cuentas' },
              { key: 'aiHaiku', label: 'Claude Haiku', desc: 'Correcciones y dinámicas rápidas' },
              { key: 'aiSonnet', label: 'Claude Sonnet', desc: 'Generación de exámenes y presentaciones' },
              { key: 'ocrEnabled', label: 'Google Vision OCR', desc: 'Corrector de exámenes manuscritos' },
              { key: 'emailNotifications', label: 'Notificaciones email', desc: 'Alertas de pago y actividad' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-[rgba(184,169,136,0.3)] last:border-0">
                <div>
                  <p className="text-[13px] font-medium text-tinta">{label}</p>
                  <p className="text-[11px] text-marron-soft">{desc}</p>
                </div>
                <Toggle on={settings[key]} onChange={() => toggle(key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Plan limits */}
        <div className="bg-card-bg border border-linea shadow-card card-fold p-5 overflow-x-auto">
          <SectionLabel className="mb-3">LÍMITES POR PLAN / MES</SectionLabel>
          <table className="vg-table">
            <thead>
              <tr><th>PLAN</th><th>EXÁMENES</th><th>OCR</th><th>DINÁM.</th><th>USERS</th></tr>
            </thead>
            <tbody>
              {PLAN_LIMITS.map((p) => (
                <tr key={p.plan}>
                  <td className="font-medium">{p.plan}</td>
                  <td className="font-mono text-[11px]">{p.exams === 0 ? '∞' : p.exams}</td>
                  <td className="font-mono text-[11px]">{p.ocr === 0 ? '∞' : p.ocr}</td>
                  <td className="font-mono text-[11px]">{p.dynamics === 0 ? '∞' : p.dynamics}</td>
                  <td className="font-mono text-[11px]">{p.users === 0 ? '∞' : p.users}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 pt-4 border-t border-linea">
            <SectionLabel className="mb-3">MODELOS IA ACTIVOS</SectionLabel>
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[12px]">
                <span className="text-marron-soft">Haiku (correcciones)</span>
                <span className="text-tinta">claude-haiku-4-5-20251001</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[12px]">
                <span className="text-marron-soft">Sonnet (generación)</span>
                <span className="text-tinta">claude-sonnet-4-6</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-[rgba(107,31,42,0.04)] border border-[#D4878A] p-4">
        <p className="font-mono text-[11px] text-granate">
          Los cambios en los servicios afectan a todos los usuarios de inmediato. Activa el modo mantenimiento antes de realizar operaciones críticas.
        </p>
      </div>
    </div>
  );
}
