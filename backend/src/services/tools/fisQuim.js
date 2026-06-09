const { callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Física y Química en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España. Tu resolución de problemas es rigurosa: muestras unidades, ' +
  'identificas datos e incógnitas, justificas el método. ' +
  'Devuelves SIEMPRE y SOLO un objeto JSON válido, sin envolverlo en markdown, sin comentarios.';

// fyq.problems — exercise_set
exports.problems = async (input, ctx) => {
  const { topic, difficulty, count = 5, course } = input;

  const messages = `Genera ${count} problemas de Física y Química sobre "${topic}", dificultad ${difficulty}, para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Problemas: ${topic}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "exercises": [
    {
      "id": 1,
      "type": "problem",
      "prompt": "enunciado completo del problema con datos numéricos y unidades",
      "data": "lista de datos extraídos del enunciado (formato 'magnitud = valor unidad')",
      "unknown": "lo que se pide calcular",
      "solution_steps": [
        "Paso 1: planteamiento (qué ley/principio se aplica y por qué)",
        "Paso 2: ecuación con símbolos",
        "Paso 3: sustitución con valores y unidades",
        "Paso 4: operaciones",
        "Paso 5: resultado final con unidades y comentario sobre orden de magnitud"
      ],
      "answer": "resultado final con unidades"
    }
  ]
}

Comprueba coherencia dimensional. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 3000,
  });
  return { output_kind: 'exercise_set', output: result };
};
