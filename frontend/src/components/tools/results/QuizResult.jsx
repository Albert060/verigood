import { useState } from 'react';
import { Card } from '../../ui';

// Render para output_kind === 'quiz'.
// Acepta: { title, topic, questions: [{id, question, options, correct_index, explanation}] }
export default function QuizResult({ data }) {
  const [showAll, setShowAll] = useState(false);

  if (!data || !Array.isArray(data.questions)) {
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
    <div>
      <div className="flex items-baseline justify-between mb-4 gap-4">
        <div>
          {data.title && <h2 className="font-display text-2xl text-tinta">{data.title}</h2>}
          {data.topic && (
            <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-marron-soft mt-1">
              Tema: {data.topic}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="font-mono text-[11px] uppercase tracking-[0.1em] text-marino border border-linea px-3 py-1.5 hover:bg-papel-hover"
        >
          {showAll ? 'Ocultar soluciones' : 'Mostrar soluciones'}
        </button>
      </div>

      <ol className="space-y-4">
        {data.questions.map((q, i) => {
          const correctIdx = typeof q.correct_index === 'number' ? q.correct_index : -1;
          return (
            <Card key={q.id ?? i} className="p-5">
              <div className="font-mono text-[12px] text-marino font-semibold mb-2">
                {String(q.id ?? i + 1).padStart(2, '0')}
              </div>
              <p className="text-tinta leading-relaxed mb-3">{q.question}</p>

              <ol className="space-y-1 list-[upper-alpha] list-inside text-tinta">
                {(q.options || []).map((opt, j) => {
                  const isCorrect = showAll && j === correctIdx;
                  return (
                    <li
                      key={j}
                      className={isCorrect ? 'text-marino font-semibold' : ''}
                    >
                      {opt}
                      {isCorrect && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em]">
                          ✓ correcta
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>

              {showAll && q.explanation && (
                <p className="mt-3 text-tinta/80 text-sm italic leading-relaxed">
                  {q.explanation}
                </p>
              )}
            </Card>
          );
        })}
      </ol>
    </div>
  );
}
