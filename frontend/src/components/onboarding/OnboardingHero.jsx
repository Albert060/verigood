import { useNavigate } from 'react-router-dom';

// Hero de bienvenida para organizaciones recién creadas.
// Se muestra cuando onboarding_completed_at es NULL y desaparece al
// completar los tres pasos o al pulsar "Marcar como completado".
export default function OnboardingHero({ state, orgName, onDismiss }) {
  const navigate = useNavigate();

  const steps = [
    {
      key: 'modules',
      done: state.has_modules,
      label: 'Activa tu primer módulo',
      hint: 'Elige qué asignaturas usará tu centro.',
      to: '/dashboard/modules',
    },
    {
      key: 'users',
      done: state.has_users,
      label: 'Invita a un profesor',
      hint: 'Añade a tu equipo desde el panel de usuarios.',
      to: '/dashboard/users',
    },
    {
      key: 'exam',
      done: state.has_exams,
      label: 'Genera tu primer recurso',
      hint: 'Crea un examen, una dinámica o una ficha.',
      to: '/dashboard/modules',
    },
  ];

  return (
    <div className="bg-card-bg border border-linea shadow-card card-fold p-7 mb-8 relative">
      <div className="font-display italic text-[14px] text-marino opacity-60 mb-3">
        § BIENVENIDA
      </div>
      <h2 className="font-display text-[26px] font-bold text-tinta leading-tight mb-2">
        Bienvenido a VeriGood, {orgName || 'tu centro'}.
      </h2>
      <p className="text-[14px] text-marron-soft max-w-2xl mb-6">
        Tu cuenta está lista. Sigue estos pasos para empezar a sacar partido
        a la plataforma. Este panel desaparecerá al completarlos.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {steps.map((step, idx) => (
          <button
            key={step.key}
            onClick={() => navigate(step.to)}
            className={`text-left p-4 border transition-all ${
              step.done
                ? 'border-[rgba(184,169,136,0.4)] opacity-60'
                : 'border-linea hover:border-tinta hover:-translate-y-0.5'
            } shadow-card`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`font-mono text-[11px] inline-flex items-center justify-center w-5 h-5 border ${
                  step.done ? 'bg-marino text-papel border-marino' : 'border-linea text-marron-soft'
                }`}
              >
                {step.done ? '✓' : idx + 1}
              </span>
              <span className="font-mono text-[10px] tracking-[0.12em] text-marron-soft uppercase">
                Paso {idx + 1}
              </span>
            </div>
            <div className="text-[14px] font-semibold text-tinta mb-1">
              {step.label}
            </div>
            <div className="text-[12px] text-marron-soft">{step.hint}</div>
          </button>
        ))}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="font-mono text-[11px] text-marron-soft hover:text-tinta underline underline-offset-2"
        >
          Ocultar y marcar como completado
        </button>
      )}
    </div>
  );
}
