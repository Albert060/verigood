import { useNavigate } from 'react-router-dom';

const MODULES = [
  { icon: '◈', title: 'Inglés / Cambridge', color: '#1F2A4D', desc: 'Exámenes A1–C2, corrector OCR de exámenes manuscritos, dinámicas y presentaciones con NotebookLM.' },
  { icon: '◆', title: 'Lengua Castellana', color: '#6B1F2A', desc: 'Ejercicios de dictado, corrector de redacción con feedback por categorías, análisis sintáctico y comentario de texto.' },
  { icon: '◉', title: 'Matemáticas', color: '#2D4A6A', desc: 'Problemas con solución paso a paso, corrección de trabajos por foto y series de ejercicios.' },
  { icon: '▥', title: 'C. del Medio', color: '#1A5C35', desc: 'Fichas temáticas, cuestionarios automáticos y actividades STEM adaptadas al currículo de Primaria.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-papel font-sans text-tinta">
      {/* Nav */}
      <nav className="border-b border-linea px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="font-display italic text-[28px] text-tinta">VeriGood</div>
          <div className="font-mono text-[11px] text-marron border border-linea px-2.5 py-1 rounded-full">BETA</div>
        </div>
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/login')}
            className="font-medium text-[15px] text-marron-soft hover:text-tinta transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={() => navigate('/register')}
            className="btn-primary text-[15px]"
          >
            Empezar gratis →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-grid-paper px-8 py-24 max-w-6xl mx-auto">
        <div className="max-w-4xl">
          <div className="font-mono text-[13px] text-marron border border-linea inline-block px-4 py-1.5 mb-8 rounded-full bg-card-bg">
            HERRAMIENTAS IA PARA DOCENTES ESPAÑOLES
          </div>
          <h1 className="font-display text-[64px] leading-[1.1] text-tinta mb-8">
            Prepara clases en minutos,<br />
            <em className="text-marino/70">no en horas.</em>
          </h1>
          <p className="text-[20px] text-marron-soft leading-relaxed mb-10 max-w-2xl">
            VeriGood es la plataforma IA para profesores de colegios españoles. Genera exámenes Cambridge, corrige redacciones, analiza sintaxis y crea fichas de Conocimiento del Medio al instante.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="btn-primary text-[17px] px-8 py-4"
            >
              Probar gratis 14 días →
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-ghost text-[17px] px-8 py-4"
            >
              Ver demo
            </button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-6 font-mono text-[13px] text-marron-soft">
            <span>✓ Sin tarjeta de crédito</span>
            <span>✓ Cancela cuando quieras</span>
            <span>✓ Servidor en España</span>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-linea bg-[rgba(31,42,77,0.04)] px-8 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '+2.000', label: 'Profesores activos' },
            { value: '+50.000', label: 'Exámenes generados' },
            { value: '4 módulos', label: 'Asignaturas cubiertas' },
            { value: '< 30 seg', label: 'Por examen generado' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono text-[32px] text-tinta font-bold">{stat.value}</div>
              <div className="font-mono text-[13px] text-marron-soft mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Modules */}
      <section className="px-8 py-20 max-w-6xl mx-auto">
        <div className="font-mono text-[13px] text-marron-soft mb-3">§ I — MÓDULOS</div>
        <h2 className="font-display text-[44px] text-tinta mb-12">Cuatro asignaturas cubiertas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODULES.map((mod) => (
            <div
              key={mod.title}
              className="bg-card-bg border border-linea shadow-card rounded-2xl p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="flex items-start gap-5">
                <div
                  className="w-14 h-14 flex items-center justify-center font-mono text-[26px] flex-shrink-0 rounded-2xl"
                  style={{ color: mod.color, background: `${mod.color}14`, border: `1px solid ${mod.color}30` }}
                >
                  {mod.icon}
                </div>
                <div>
                  <div className="font-semibold text-[20px] text-tinta mb-2">{mod.title}</div>
                  <p className="text-[16px] text-marron-soft leading-relaxed">{mod.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-linea bg-[rgba(184,169,136,0.08)] px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="font-mono text-[13px] text-marron-soft mb-3">§ II — CÓMO FUNCIONA</div>
          <h2 className="font-display text-[44px] text-tinta mb-12">De cero al examen en 3 pasos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Configura', desc: 'Selecciona nivel, tipo de ejercicio y número de preguntas. Todo con 2–3 clics.' },
              { n: '02', title: 'Genera con IA', desc: 'Claude Sonnet crea el contenido al instante. La base de datos aporta preguntas validadas.' },
              { n: '03', title: 'Usa en clase', desc: 'Descarga, imprime o proyecta directamente. Guarda en tu historial.' },
            ].map((step) => (
              <div key={step.n} className="bg-card-bg rounded-2xl p-7 border border-linea shadow-card">
                <div className="font-display italic text-[56px] text-marino/20 mb-4 leading-none">{step.n}</div>
                <div className="font-semibold text-[20px] text-tinta mb-3">{step.title}</div>
                <p className="text-[16px] text-marron-soft leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-24 max-w-5xl mx-auto text-center">
        <h2 className="font-display text-[52px] text-tinta mb-5 leading-tight">
          Empieza hoy gratis.
        </h2>
        <p className="text-[18px] text-marron-soft mb-10">
          14 días de prueba completa. Sin tarjeta de crédito.
        </p>
        <button
          onClick={() => navigate('/register')}
          className="btn-primary px-10 py-4 text-[18px]"
        >
          Crear cuenta gratuita →
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-linea px-8 py-8 flex flex-wrap items-center justify-between gap-4">
        <div className="font-display italic text-[20px] text-tinta">VeriGood</div>
        <div className="font-mono text-[13px] text-marron-soft">
          © 2026 VeriGood · Hecho en España · Datos en la UE
        </div>
        <div className="flex items-center gap-5 font-mono text-[13px] text-marron-soft">
          <button className="hover:text-tinta transition-colors">Privacidad</button>
          <button className="hover:text-tinta transition-colors">Términos</button>
          <button className="hover:text-tinta transition-colors">Contacto</button>
        </div>
      </footer>
    </div>
  );
}
