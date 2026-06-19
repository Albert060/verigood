const { callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Matemáticas en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España. Tu resolución es rigurosa: identificas datos e incógnitas, ' +
  'planteas con notación matemática estándar y comprobas el resultado. ' +
  'Devuelves SIEMPRE y SOLO un objeto JSON válido, sin envolverlo en markdown, sin comentarios.';

// mat_eso.problems — exercise_set
exports.problems = async (input, ctx) => {
  const { topic, difficulty, count = 6, course } = input;

  const messages = `Genera ${count} problemas de Matemáticas sobre "${topic}", dificultad ${difficulty}, para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Problemas: ${topic}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "course": "${course}",
  "exercises": [
    {
      "id": 1,
      "type": "problem",
      "prompt": "enunciado completo y contextualizado",
      "data": "datos numéricos extraídos del enunciado",
      "unknown": "qué se pide calcular",
      "solution_steps": [
        "Paso 1: identificación del problema y estrategia",
        "Paso 2: planteamiento con notación matemática",
        "Paso 3: desarrollo paso a paso",
        "Paso 4: resultado con unidades / dominio",
        "Paso 5: comprobación o interpretación del resultado"
      ],
      "answer": "resultado final"
    }
  ]
}

Mantén coherencia con el nivel curricular de ${course}. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 3000,
  });
  return { output_kind: 'exercise_set', output: result };
};

// mat_eso.exercises — exercise_set
exports.exercises = async (input, ctx) => {
  const { topic, count = 15, course } = input;

  const messages = `Genera una tanda de ${count} ejercicios sobre "${topic}" para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Ejercicios: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "exercises": [
    { "id": 1, "type": "calculation", "prompt": "ejercicio con notación matemática", "answer": "resultado" }
  ]
}

Dificultad gradual de menor a mayor. Sin enunciados verbalizados, son ejercicios procedimentales puros. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2400,
  });
  return { output_kind: 'exercise_set', output: result };
};

// mat_eso.exam — exercise_set
exports.exam = async (input, ctx) => {
  const { topic, count = 8, course } = input;

  const messages = `Genera ${count} preguntas de examen sobre "${topic}" para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Examen: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "exercises": [
    {
      "id": 1,
      "type": "multiple_choice" | "open" | "essay",
      "prompt": "enunciado de la pregunta",
      "options": ["A","B","C","D"],
      "answer": "respuesta modelo (breve si es open/multiple_choice; esquema si es essay)",
      "points": número sobre 10
    }
  ]
}

Mezcla tipos. La suma de "points" debe ser 10. Distractores plausibles en multiple_choice. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2800,
  });
  return { output_kind: 'exercise_set', output: result };
};
