const { callClaude, callClaudeJSON } = require('../claudeService');
const { withCuratedBank } = require('../hybridGeneratorService');

const SYSTEM =
  'Eres profesor de Geografía e Historia en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España, con rigor histórico/geográfico, y vocabulario adecuado al curso. ' +
  'Nada de relleno, nada de emojis.';

// geh.sheets — text
exports.sheets = async (input, ctx) => {
  const { topic, course } = input;

  const messages = `Elabora una ficha temática sobre "${topic}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Título y breve introducción (3-4 líneas, contextualiza espacio y tiempo)
2. Conceptos clave (5-7, cada uno con definición de una frase)
3. Desarrollo del tema (4-6 párrafos, encadenados, sin viñetas)
4. Hitos o fechas/lugares relevantes (lista breve)
5. Personajes o agentes implicados (con una línea de descripción cada uno)
6. Actividades para el alumno (3 actividades graduadas: comprensión, análisis, opinión razonada)
7. Cierre / pregunta abierta para conectar con la actualidad`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'text', output: text };
};

// geh.timeline — timeline
exports.timeline = async (input, ctx) => {
  const { period, events_count = 8, course } = input;

  const messages = `Genera una línea de tiempo histórica sobre "${period}" con ${events_count} hitos, para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "string en español",
  "period": "${period}",
  "events": [
    {
      "year": "fecha o rango (p.ej. '218 a.C.', '711', '1492', '1808-1814')",
      "year_sort": número entero negativo para a.C., positivo para d.C. (para ordenar),
      "title": "título corto del hito",
      "description": "1-3 frases con causas, hecho y consecuencias inmediatas",
      "actors": ["personajes o agentes implicados"]
    }
  ]
}

Los hitos deben estar ordenados cronológicamente y elegidos por su relevancia, no de forma aleatoria. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2500,
  });
  return { output_kind: 'timeline', output: result };
};

// geh.quiz — quiz (itemsKey 'questions')
exports.quiz = async (input, ctx) => {
  const { topic, question_count = 10, course } = input;

  // Para quiz necesitamos mapear correct_index. Si la BD trae options + answer
  // textual, buscamos el índice de la respuesta dentro de options.
  const findCorrectIndex = (opts, ans) => {
    if (!Array.isArray(opts) || !ans) return 0;
    const i = opts.findIndex((o) => String(o).trim().toLowerCase() === String(ans).trim().toLowerCase());
    return i >= 0 ? i : 0;
  };

  const output = await withCuratedBank({
    moduleId: ctx.moduleId,
    input, count: question_count, topic, course,
    itemsKey: 'questions',
    mapSeed: (row) => ({
      question: row.question,
      options: row.options || [],
      correct_index: findCorrectIndex(row.options, row.answer),
      explanation: row.explanation || undefined,
    }),
    buildOutput: async ({ remaining }) => {
      const messages = `Genera un cuestionario tipo test sobre "${topic}" con ${remaining} preguntas, para alumnos de ${course}.

Devuelve JSON estricto:
{
  "title": "string en español",
  "topic": "${topic}",
  "questions": [
    { "question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..." }
  ]
}

4 opciones por pregunta. Mezcla hechos, causas, consecuencias y comparativas. Distractores plausibles. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2500 });
    },
  });
  return { output_kind: 'quiz', output };
};
