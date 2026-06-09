import { Card } from '../../ui';

// Render para output_kind === 'exercise_set'.
// Acepta: { title, level?, topic?, passage?, exercises: [...] }
// Cada ejercicio:
//   { id, type, prompt, options?, answer, explanation?, data?, unknown?, solution_steps?, points? }
export default function ExerciseSetResult({ data }) {
  if (!data || !Array.isArray(data.exercises)) {
    return (
      <Card className="p-6">
        <p className="font-mono text-[12px] text-granate">
          Formato de respuesta inesperado.
        </p>
        <pre className="mt-3 font-mono text-[11px] whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {(data.title || data.level || data.topic) && (
        <div className="mb-2">
          {data.title && (
            <h2 className="font-display text-2xl text-tinta">{data.title}</h2>
          )}
          <div className="font-mono text-[11px] text-marron-soft uppercase tracking-[0.1em] mt-1">
            {data.level && <span>Nivel: {data.level}</span>}
            {data.level && data.topic && <span> · </span>}
            {data.topic && <span>Tema: {data.topic}</span>}
          </div>
        </div>
      )}

      {data.passage && (
        <Card className="p-6 bg-papel">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-marron-soft mb-2">
            Texto
          </div>
          <div className="whitespace-pre-wrap text-tinta font-display leading-relaxed">
            {data.passage}
          </div>
        </Card>
      )}

      {data.exercises.map((ex, i) => (
        <Card key={ex.id ?? i} className="p-5">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-mono text-[12px] text-marino font-semibold">
              {String(ex.id ?? i + 1).padStart(2, '0')}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-marron-soft">
              {ex.type || 'ejercicio'}
              {typeof ex.points === 'number' && ` · ${ex.points} pt`}
            </span>
          </div>

          <p className="text-tinta leading-relaxed whitespace-pre-wrap">
            {ex.prompt}
          </p>

          {Array.isArray(ex.options) && ex.options.length > 0 && (
            <ol className="mt-3 space-y-1 list-[upper-alpha] list-inside text-tinta">
              {ex.options.map((opt, j) => (
                <li key={j}>{opt}</li>
              ))}
            </ol>
          )}

          {Array.isArray(ex.data) && ex.data.length > 0 && (
            <div className="mt-3 font-mono text-[12px] text-tinta">
              <div className="text-marron-soft uppercase text-[10px] tracking-[0.1em] mb-1">
                Datos
              </div>
              <ul className="list-disc list-inside">
                {ex.data.map((d, j) => <li key={j}>{d}</li>)}
              </ul>
            </div>
          )}

          {ex.unknown && (
            <div className="mt-2 font-mono text-[12px]">
              <span className="text-marron-soft uppercase text-[10px] tracking-[0.1em]">Incógnita: </span>
              <span className="text-tinta">{ex.unknown}</span>
            </div>
          )}

          {Array.isArray(ex.solution_steps) && ex.solution_steps.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-marino">
                Ver resolución paso a paso
              </summary>
              <ol className="mt-3 space-y-2 list-decimal list-inside text-tinta">
                {ex.solution_steps.map((s, j) => (
                  <li key={j} className="leading-relaxed">{s}</li>
                ))}
              </ol>
            </details>
          )}

          {ex.answer !== undefined && (
            <details className="mt-3">
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-granate">
                Solución
              </summary>
              <div className="mt-2 text-tinta font-display whitespace-pre-wrap">
                {String(ex.answer)}
              </div>
              {ex.explanation && (
                <p className="mt-2 text-tinta/80 text-sm leading-relaxed">
                  {ex.explanation}
                </p>
              )}
            </details>
          )}
        </Card>
      ))}
    </div>
  );
}
