const { callClaudeJSON } = require('../claudeService');
const { withCuratedBank } = require('../hybridGeneratorService');

const SYSTEM =
  'Eres profesor de Física y Química en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España. Tu resolución de problemas es rigurosa: muestras unidades, ' +
  'identificas datos e incógnitas, justificas el método. ' +
  'Devuelves SIEMPRE y SOLO un objeto JSON válido, sin envolverlo en markdown, sin comentarios.';

// fyq.problems — exercise_set
exports.problems = async (input, ctx) => {
  const { topic, difficulty, count = 5, course } = input;

  const output = await withCuratedBank({
    moduleId: ctx.moduleId,
    input, count, topic, course,
    mapSeed: (row) => ({
      type: row.type || 'problem',
      prompt: row.question,
      answer: row.answer,
      explanation: row.explanation || undefined,
    }),
    buildOutput: async ({ remaining }) => {
      const messages = `Genera ${remaining} problemas de Física y Química sobre "${topic}", dificultad ${difficulty}, para alumnos de ${course}.

Devuelve JSON estricto:
{
  "title": "Problemas: ${topic}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "exercises": [
    {
      "type": "problem",
      "prompt": "enunciado con datos y unidades",
      "solution_steps": ["Paso 1: ley aplicada", "Paso 2: ecuación", "Paso 3: sustitución"],
      "answer": "resultado con unidades"
    }
  ]
}

Coherencia dimensional. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 3000 });
    },
  });
  return { output_kind: 'exercise_set', output };
};
