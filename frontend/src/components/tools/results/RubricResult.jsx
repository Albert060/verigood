import { Card } from '../../ui';

// Render para output_kind === 'rubric'.
// Acepta: { title, criteria: [{ name, description, levels: [{level, descriptor, points}] }] }
export default function RubricResult({ data }) {
  if (!data || !Array.isArray(data.criteria)) {
    return (
      <Card className="p-6">
        <p className="font-mono text-[12px] text-granate">Formato inesperado.</p>
        <pre className="mt-3 font-mono text-[11px] whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    );
  }

  // Niveles únicos para cabecera (preservando el orden del primer criterio).
  const headerLevels = (data.criteria[0]?.levels || []).map((l) => l.level);

  return (
    <div>
      {data.title && (
        <h2 className="font-display text-2xl text-tinta mb-4">{data.title}</h2>
      )}

      <div className="overflow-x-auto">
        <table className="vg-table w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left font-mono text-[10px] uppercase tracking-[0.1em] text-marron-soft p-3 border-b border-linea">
                Criterio
              </th>
              {headerLevels.map((lvl) => (
                <th
                  key={lvl}
                  className="text-left font-mono text-[10px] uppercase tracking-[0.1em] text-marron-soft p-3 border-b border-linea"
                >
                  {lvl}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.criteria.map((c, i) => (
              <tr key={i} className="align-top">
                <td className="p-3 border-b border-linea/60 max-w-[200px]">
                  <div className="font-display text-tinta text-base leading-tight">{c.name}</div>
                  {c.description && (
                    <div className="text-tinta/70 text-xs mt-1 leading-relaxed">{c.description}</div>
                  )}
                </td>
                {(c.levels || []).map((lvl, j) => (
                  <td key={j} className="p-3 border-b border-linea/60 text-tinta text-sm leading-relaxed">
                    {typeof lvl.points === 'number' && (
                      <div className="font-mono text-[10px] text-marino mb-1">
                        {lvl.points} pt
                      </div>
                    )}
                    <div>{lvl.descriptor}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
