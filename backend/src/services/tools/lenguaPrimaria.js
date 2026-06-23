const { callClaude, callClaudeJSON } = require('../claudeService');
const { withCuratedBank } = require('../hybridGeneratorService');

const SYSTEM =
  'Eres maestro de Lengua castellana y literatura en Primaria, en un colegio español, con criterio LOMLOE. ' +
  'Escribes en español de España, con vocabulario adaptado al curso. Cuidas la corrección ortográfica ' +
  'y la coherencia. Nada de relleno, nada de emojis.';

// len_prim.exercises — exercise_set
exports.exercises = async (input, ctx) => {
  const { course, focus, count = 12 } = input;

  const output = await withCuratedBank({
    moduleId: ctx.moduleId,
    input, count, topic: focus, course,
    mapSeed: (row) => ({
      type: row.type || 'fill_in',
      prompt: row.question,
      options: row.options || undefined,
      answer: row.answer,
    }),
    buildOutput: async ({ remaining }) => {
      const messages = `Genera ${remaining} ejercicios de Lengua de tipo "${focus}" para alumnos de ${course}.

Devuelve JSON estricto:
{
  "title": "Ejercicios: ${focus}",
  "topic": "${focus}",
  "course": "${course}",
  "exercises": [
    { "type": "fill_in"|"transform"|"identify"|"multiple_choice",
      "prompt": "...", "options": ["A","B","C","D"], "answer": "..." }
  ]
}

Las opciones solo aparecen en multiple_choice. Mezcla tipos. Frases verosímiles, contextualizadas. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2600 });
    },
  });
  return { output_kind: 'exercise_set', output };
};

// len_prim.reading — exercise_set (la BD solo aporta preguntas; el "passage"
// lo genera siempre Claude porque no es seedable por tema).
exports.reading = async (input, ctx) => {
  const { course, topic, question_count = 8 } = input;

  const output = await withCuratedBank({
    moduleId: ctx.moduleId,
    input, count: question_count, topic, course,
    mapSeed: (row) => ({
      type: row.type || 'literal',
      prompt: row.question,
      options: row.options || undefined,
      answer: row.answer,
    }),
    buildOutput: async ({ remaining }) => {
      const messages = `Crea una actividad de comprensión lectora para alumnos de ${course} sobre "${topic}".

Devuelve JSON estricto:
{
  "title": "Lectura: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "instructions": "Lee el texto y responde a las preguntas.",
  "passage": "texto de 180-280 palabras adaptado al curso",
  "exercises": [
    { "type": "literal"|"inferential"|"vocabulary"|"personal_response",
      "prompt": "...", "options": ["A","B","C","D"], "answer": "..." }
  ]
}

Genera ${remaining} preguntas equilibradas. 1º-2º: frases cortas. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2800 });
    },
  });
  return { output_kind: 'exercise_set', output };
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
