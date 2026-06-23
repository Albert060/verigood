const { callClaude, callClaudeJSON } = require('../claudeService');
const { withCuratedBank } = require('../hybridGeneratorService');

const SYSTEM =
  'Eres profesor de Matemáticas en Primaria, en un colegio español, con criterio LOMLOE. ' +
  'Escribes en español de España, con vocabulario adaptado a la edad del alumno. ' +
  'Tus problemas son verosímiles y cercanos a su realidad. Nada de relleno, nada de emojis.';

// mat_prim.problems — exercise_set
exports.problems = async (input, ctx) => {
  const { course, topic, count = 6 } = input;

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
      const messages = `Genera ${remaining} problemas matemáticos verbalizados sobre "${topic}" para alumnos de ${course}.

Devuelve JSON estricto:
{
  "title": "Problemas: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "exercises": [
    {
      "type": "problem",
      "prompt": "enunciado contextualizado",
      "solution_steps": ["Paso 1: ...", "Paso 2: ..."],
      "answer": "respuesta con unidades"
    }
  ]
}

Adapta números y operaciones al curso. Para 1º-2º cifras pequeñas; 5º-6º decimales/fracciones si encaja. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2800 });
    },
  });
  return { output_kind: 'exercise_set', output };
};

// mat_prim.series — exercise_set
exports.series = async (input, ctx) => {
  const { course, skill, count = 15 } = input;

  const output = await withCuratedBank({
    moduleId: ctx.moduleId,
    input, count, topic: skill, course,
    mapSeed: (row) => ({
      type: row.type || 'calculation',
      prompt: row.question,
      answer: row.answer,
    }),
    buildOutput: async ({ remaining }) => {
      const messages = `Genera una serie de ${remaining} ejercicios de cálculo para practicar "${skill}" en ${course}.

Devuelve JSON estricto:
{
  "title": "Serie: ${skill}",
  "topic": "${skill}",
  "course": "${course}",
  "exercises": [ { "type": "calculation", "prompt": "...", "answer": "..." } ]
}

Dificultad gradual. Sin enunciados verbalizados, solo cálculo. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2200 });
    },
  });
  return { output_kind: 'exercise_set', output };
};

// mat_prim.manipulative — text
exports.manipulative = async (input, ctx) => {
  const { course, concept } = input;

  const messages = `Diseña una actividad manipulativa para introducir o reforzar "${concept}" en ${course}.

Devuelve un texto en español de España estructurado con:

1. Objetivo de aprendizaje (1-2 frases competenciales)
2. Materiales (cerrados, baratos, fáciles de conseguir en un aula española)
3. Disposición del aula (individual / parejas / grupos)
4. Procedimiento paso a paso (numerado, con minutos por bloque)
5. Pregunta-clave que el profesor lanza durante la actividad
6. Cierre: 3 preguntas de reflexión que conecten lo manipulativo con lo abstracto
7. Atención a la diversidad: variante para alumnado que va más lento + ampliación
8. Indicadores de evaluación observables (3)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1600 });
  return { output_kind: 'text', output: text };
};
