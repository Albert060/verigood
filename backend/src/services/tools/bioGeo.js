const { callClaude, callClaudeJSON } = require('../claudeService');
const { withCuratedBank } = require('../hybridGeneratorService');

const SYSTEM =
  'Eres profesor de Biología y Geología en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España, con rigor científico y vocabulario adecuado al curso. ' +
  'Nada de relleno, nada de emojis.';

// byg.schemas — text
exports.schemas = async (input, ctx) => {
  const { topic, course } = input;

  const messages = `Elabora un esquema jerárquico sobre "${topic}" para alumnos de ${course}.

Devuelve un texto en español de España con un esquema indentado (usa guiones y sangría), siguiendo este patrón:

- Tema principal
  - Subtema 1
    - Concepto a (definición breve entre paréntesis)
    - Concepto b (definición breve)
      - Relaciones / ejemplos
  - Subtema 2
    - …

Después del esquema, añade en orden:

1. Definiciones (glosario de los 6-10 términos clave que aparezcan)
2. Conexiones importantes (3-5 relaciones causa-efecto o de jerarquía que el alumno debe entender)
3. Una pregunta abierta para evaluar comprensión profunda`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

const CONTEXT_LABEL = {
  laboratorio: 'práctica de laboratorio (con material habitual de un IES)',
  aula:        'actividad práctica de aula (sin material de laboratorio)',
  campo:       'salida de campo (entorno natural o urbano cercano)',
};

// byg.lab — text
exports.lab = async (input, ctx) => {
  const { topic, context, course } = input;
  const contextLabel = CONTEXT_LABEL[context] || context;

  const messages = `Diseña una ${contextLabel} sobre "${topic}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Título
2. Objetivos de aprendizaje (2-3, competenciales)
3. Materiales y reactivos (lista cerrada, realista para un IES público español)
4. Medidas de seguridad relevantes
5. Procedimiento paso a paso (numerado, con tiempo estimado por bloque)
6. Cuestiones para el cuaderno del alumno (5 preguntas: 2 de observación, 2 de interpretación, 1 de transferencia)
7. Criterios de evaluación (rúbrica breve, 3-4 indicadores)
8. Variantes para alumnado con dificultades + ampliación opcional`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'text', output: text };
};

const TYPE_HINT = {
  mixto:      'mezcla equilibrada de los tres tipos',
  test:       'sólo preguntas tipo test (multiple_choice)',
  abiertas:   'sólo preguntas abiertas de respuesta breve',
  desarrollo: 'sólo preguntas de desarrollo amplio',
};

// byg.exam — exercise_set
exports.exam = async (input, ctx) => {
  const { topic, types, count = 10, course } = input;
  const typeHint = TYPE_HINT[types] || types;

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
      const messages = `Genera ${remaining} preguntas de examen sobre "${topic}" para alumnos de ${course}. Tipo: ${typeHint}.

Devuelve JSON estricto:
{
  "title": "Examen: ${topic}",
  "topic": "${topic}",
  "exercises": [
    { "type": "multiple_choice"|"open"|"essay",
      "prompt": "...", "options": ["A","B","C","D"], "answer": "...",
      "points": número }
  ]
}

Distractores plausibles. En essay, "answer" es rúbrica/esquema. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2800 });
    },
  });
  return { output_kind: 'exercise_set', output };
};
