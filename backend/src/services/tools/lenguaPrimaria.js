const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres maestro de Lengua castellana y literatura en Primaria, en un colegio español, con criterio LOMLOE. ' +
  'Escribes en español de España, con vocabulario adaptado al curso. Cuidas la corrección ortográfica ' +
  'y la coherencia. Nada de relleno, nada de emojis.';

// len_prim.exercises — exercise_set
exports.exercises = async (input, ctx) => {
  const { course, focus, count = 12 } = input;

  const messages = `Genera ${count} ejercicios de Lengua de tipo "${focus}" para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Ejercicios: ${focus}",
  "topic": "${focus}",
  "course": "${course}",
  "exercises": [
    {
      "id": 1,
      "type": "fill_in" | "transform" | "identify" | "multiple_choice",
      "prompt": "enunciado claro y corto",
      "options": ["A","B","C","D"],
      "answer": "respuesta modelo"
    }
  ]
}

Las opciones sólo aparecen en multiple_choice. Mezcla tipos para variedad. Las frases deben ser verosímiles, contextualizadas, en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2600,
  });
  return { output_kind: 'exercise_set', output: result };
};

// len_prim.reading — exercise_set
exports.reading = async (input, ctx) => {
  const { course, topic, question_count = 8 } = input;

  const messages = `Crea una actividad de comprensión lectora para alumnos de ${course} sobre "${topic}".

Devuelve JSON estricto con este formato:
{
  "title": "Lectura: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "instructions": "Lee el texto y responde a las preguntas.",
  "passage": "texto de 180-280 palabras adaptado al curso, con vocabulario ajustado",
  "exercises": [
    {
      "id": 1,
      "type": "literal" | "inferential" | "vocabulary" | "personal_response",
      "prompt": "pregunta",
      "options": ["A","B","C","D"],
      "answer": "respuesta esperada"
    }
  ]
}

Genera ${question_count} preguntas equilibradas (literales, inferenciales, de vocabulario, de respuesta personal). Para 1º-2º, frases cortas y vocabulario básico. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2800,
  });
  return { output_kind: 'exercise_set', output: result };
};

// len_prim.writing — text
exports.writing = async (input, ctx) => {
  const { course, genre } = input;

  const messages = `Diseña una propuesta de escritura del género "${genre}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Título de la actividad
2. Contexto motivador (situación o disparador que dé sentido a escribir)
3. Tarea concreta (qué tipo de texto producen, extensión orientativa adaptada al curso)
4. Andamiaje (estructura básica del texto + 4-6 conectores útiles + vocabulario sugerido)
5. Plantilla guiada (esqueleto con huecos: introducción / desarrollo / cierre)
6. Criterios de revisión por el alumno (checklist de 5 ítems: coherencia, ortografía, signos de puntuación, vocabulario, presentación)
7. Indicadores de evaluación del profesor (3 criterios observables)
8. Atención a la diversidad: variante para alumnado con dificultades + ampliación creativa`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1600 });
  return { output_kind: 'text', output: text };
};
