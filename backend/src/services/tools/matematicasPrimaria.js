const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Matemáticas en Primaria, en un colegio español, con criterio LOMLOE. ' +
  'Escribes en español de España, con vocabulario adaptado a la edad del alumno. ' +
  'Tus problemas son verosímiles y cercanos a su realidad. Nada de relleno, nada de emojis.';

const COURSES = ['1º Primaria','2º Primaria','3º Primaria','4º Primaria','5º Primaria','6º Primaria'];

// mat_prim.problems — exercise_set
exports.problems = async (input, ctx) => {
  const { course, topic, count = 6 } = input;

  const messages = `Genera ${count} problemas matemáticos verbalizados sobre "${topic}" para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Problemas: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "exercises": [
    {
      "id": 1,
      "type": "problem",
      "prompt": "enunciado del problema, contextualizado en la vida cotidiana del niño",
      "data": "datos extraídos del enunciado (lista)",
      "unknown": "qué se pide",
      "solution_steps": [
        "Paso 1: qué entiendo del problema",
        "Paso 2: qué operación elijo y por qué",
        "Paso 3: planteamiento numérico",
        "Paso 4: resultado con unidades y comprobación"
      ],
      "answer": "respuesta final con unidades"
    }
  ]
}

Adapta números y operaciones al curso. Para 1º-2º usa cifras pequeñas; para 5º-6º incluye decimales o fracciones si encaja con el tema. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2800,
  });
  return { output_kind: 'exercise_set', output: result };
};

// mat_prim.series — exercise_set
exports.series = async (input, ctx) => {
  const { course, skill, count = 15 } = input;

  const messages = `Genera una serie de ${count} ejercicios de cálculo para practicar "${skill}" en ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Serie: ${skill}",
  "topic": "${skill}",
  "course": "${course}",
  "exercises": [
    { "id": 1, "type": "calculation", "prompt": "ejercicio de cálculo (notación matemática clara)", "answer": "resultado" }
  ]
}

Dificultad gradual de menor a mayor dentro de la serie. Sin enunciados verbalizados, sólo cálculo. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2200,
  });
  return { output_kind: 'exercise_set', output: result };
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
