import { Link, useOutletContext } from 'react-router-dom';
import { PageHeader, Card } from '../../components/ui';

// Landing del módulo. Grid con las tools disponibles.
export default function ModuleHome() {
  const { mod, tools, moduleId } = useOutletContext();
  const base = mod?.route_prefix || `#${moduleId}`;

  return (
    <div className="animate-slide-in">
      <PageHeader
        title={mod?.name || 'Módulo'}
        subtitle="HERRAMIENTAS DISPONIBLES"
        romanNum="§ I"
      />

      {tools.length === 0 && (
        <p className="font-mono text-[12px] text-marron-soft mt-4">
          Este módulo aún no tiene herramientas vinculadas.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
        {tools.map((t) => (
          <Link key={t.key} to={`${base}/${t.key}`} className="group">
            <Card className="h-full p-5 transition-shadow group-hover:shadow-[2px_2px_0_rgba(184,169,136,0.6)]">
              <div className="font-mono text-[10px] text-marron-soft tracking-[0.15em] uppercase mb-2">
                {t.key}
              </div>
              <h3 className="font-display text-xl text-tinta leading-tight">{t.name}</h3>
              <p className="text-sm text-tinta/80 mt-2 leading-relaxed">{t.description}</p>
              <div className="mt-4 font-mono text-[11px] text-marino">
                Abrir herramienta →
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
