import { Card } from '../../ui';

// Render para output_kind === 'timeline'.
// Acepta: { title, period, events: [{year, year_sort?, title, description, actors?}] }
export default function TimelineResult({ data }) {
  if (!data || !Array.isArray(data.events)) {
    return (
      <Card className="p-6">
        <p className="font-mono text-[12px] text-granate">Formato inesperado.</p>
        <pre className="mt-3 font-mono text-[11px] whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    );
  }

  // Ordenamos por year_sort si está, si no respetamos el orden recibido.
  const events = [...data.events].sort((a, b) => {
    if (typeof a.year_sort === 'number' && typeof b.year_sort === 'number') {
      return a.year_sort - b.year_sort;
    }
    return 0;
  });

  return (
    <div>
      {data.title && (
        <h2 className="font-display text-2xl text-tinta mb-1">{data.title}</h2>
      )}
      {data.period && (
        <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-marron-soft mb-6">
          Periodo: {data.period}
        </div>
      )}

      <div className="relative pl-10">
        {/* Eje vertical */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-linea" />

        <ol className="space-y-6">
          {events.map((ev, i) => (
            <li key={i} className="relative">
              {/* Marca en el eje */}
              <div className="absolute -left-[30px] top-1.5 w-3 h-3 border border-marino bg-papel" />
              <div className="font-mono text-[12px] text-marino font-semibold">
                {ev.year}
              </div>
              <div className="font-display text-lg text-tinta mt-0.5 leading-tight">
                {ev.title}
              </div>
              {ev.description && (
                <p className="text-tinta/85 text-sm mt-1 leading-relaxed">
                  {ev.description}
                </p>
              )}
              {Array.isArray(ev.actors) && ev.actors.length > 0 && (
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-marron-soft">
                  Agentes: {ev.actors.join(' · ')}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
