const { callClaudeJSON } = require('../claudeService');
const { withCuratedBank } = require('../hybridGeneratorService');

const SYSTEM =
  'Eres profesor de Matemáticas en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España. Tu resolución es rigurosa: identificas datos e incógnitas, ' +
  'planteas con notación matemática estándar y comprobas el resultado. ' +
  'Devuelves SIEMPRE y SOLO un objeto JSON válido, sin envolverlo en markdown, sin comentarios.';

// mat_eso.problems — exercise_set
exports.problems = async (input, ctx) => {
  const { topic, difficulty, count = 6, course } = input;

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
      const messages = `Genera ${remaining} problemas de Matemáticas sobre "${topic}", dificultad ${difficulty}, para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Problemas: ${topic}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "course": "${course}",
  "exercises": [
    {
      "type": "problem",
      "prompt": "enunciado completo y contextualizado",
      "data": "datos numéricos extraídos del enunciado",
      "unknown": "qué se pide calcular",
      "solution_steps": ["Paso 1: ...", "Paso 2: ..."],
      "answer": "resultado final"
    }
  ]
}

Mantén coherencia con el nivel curricular de ${course}. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 3000 });
    },
  });
  return { output_kind: 'exercise_set', output };
};

// mat_eso.exercises — exercise_set
exports.exercises = async (input, ctx) => {
  const { topic, count = 15, course } = input;

  const output = await withCuratedBank({
    moduleId: ctx.moduleId,
    input, count, topic, course,
    mapSeed: (row) => ({
      type: row.type || 'calculation',
      prompt: row.question,
      answer: row.answer,
    }),
    buildOutput: async ({ remaining }) => {
      const messages = `Genera una tanda de ${remaining} ejercicios sobre "${topic}" para alumnos de ${course}.

Devuelve JSON estricto:
{
  "title": "Ejercicios: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "exercises": [ { "type": "calculation", "prompt": "...", "answer": "..." } ]
}

Dificultad gradual. Ejercicios procedimentales puros. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2400 });
    },
  });
  return { output_kind: 'exercise_set', output };
};

// mat_eso.exam — exercise_set
exports.exam = async (input, ctx) => {
  const { topic, count = 8, course } = input;

  const output = await withCuratedBank({
    moduleId: ctx.moduleId,
    input, count, topic, course,
    mapSeed: (row) => ({
      type: row.type || 'open',
      prompt: row.question,
      options: row.options || undefined,
      answer: row.answer,
      explanation: row.explanation || undefined,
      points: row.points || 1,
    }),
    buildOutput: async ({ remaining }) => {
      const messages = `Genera ${remaining} preguntas de examen sobre "${topic}" para alumnos de ${course}.

Devuelve JSON estricto:
{
  "title": "Examen: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "exercises": [
    { "type": "multiple_choice"|"open"|"essay", "prompt": "...", "options": ["A","B","C","D"], "answer": "...", "points": número }
  ]
}

Mezcla tipos. La suma de "points" debe ser 10. Distractores plausibles. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2800 });
    },
  });
  return { output_kind: 'exercise_set', output };
};
