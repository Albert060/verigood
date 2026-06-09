import { Card } from '../../ui';

// Render para output_kind === 'commentary'.
// Acepta: {
//   title, source_text, context,
//   key_concepts: [{term, definition}],
//   commentary_paragraphs: [string],
//   guiding_questions: [string]
// }
export default function CommentaryResult({ data }) {
  if (!data || !Array.isArray(data.commentary_paragraphs)) {
    return (
      <Card className="p-6">
        <p className="font-mono text-[12px] text-granate">Formato inesperado.</p>
        <pre className="mt-3 font-mono text-[11px] whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {data.title && (
        <h2 className="font-display text-2xl text-tinta">{data.title}</h2>
      )}

      {data.source_text && (
        <Card className="p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-marron-soft mb-2">
            Texto
          </div>
          <div className="whitespace-pre-wrap text-tinta font-display leading-relaxed italic">
            {data.source_text}
          </div>
        </Card>
      )}

      {data.context && (
        <Card className="p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-marron-soft mb-2">
            Contexto
          </div>
          <p className="text-tinta leading-relaxed">{data.context}</p>
        </Card>
      )}

      {Array.isArray(data.key_concepts) && data.key_concepts.length > 0 && (
        <Card className="p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-marron-soft mb-3">
            Conceptos clave
          </div>
          <dl className="space-y-2">
            {data.key_concepts.map((c, i) => (
              <div key={i} className="flex flex-wrap gap-x-3">
                <dt className="font-display text-tinta font-semibold">{c.term}</dt>
                <dd className="text-tinta/85 flex-1 min-w-[200px]">{c.definition}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <Card className="p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-marron-soft mb-3">
          Comentario
        </div>
        <div className="space-y-4 text-tinta leading-relaxed">
          {data.commentary_paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </Card>

      {Array.isArray(data.guiding_questions) && data.guiding_questions.length > 0 && (
        <Card className="p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-marron-soft mb-3">
            Preguntas guía
          </div>
          <ol className="list-decimal list-inside space-y-1 text-tinta">
            {data.guiding_questions.map((q, i) => <li key={i}>{q}</li>)}
          </ol>
        </Card>
      )}
    </div>
  );
}
