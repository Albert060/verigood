const { callClaude, callClaudeJSON } = require('../claudeService');
const { withCuratedBank } = require('../hybridGeneratorService');

const SYSTEM =
  'Eres profesor de Lengua castellana y literatura en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España, con rigor lingüístico, vocabulario técnico ajustado al curso ' +
  'y conexión con los géneros y autores del currículo. Nada de relleno, nada de emojis.';

// len_eso.exercises — exercise_set
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
      const messages = `Genera ${remaining} ejercicios de Lengua sobre "${focus}" para alumnos de ${course}.

Devuelve JSON estricto:
{
  "title": "Ejercicios: ${focus}",
  "topic": "${focus}",
  "course": "${course}",
  "exercises": [
    { "type": "fill_in"|"transform"|"identify"|"multiple_choice"|"open",
      "prompt": "...", "options": ["A","B","C","D"], "answer": "..." }
  ]
}

Mezcla tipos. Frases verosímiles, complejidad sintáctica apropiada al curso. En preguntas abiertas, "answer" es un esquema. Todo en español de España.`;
      return callClaudeJSON({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2600 });
    },
  });
  return { output_kind: 'exercise_set', output };
};

// len_eso.syntax — text
exports.syntax = async (input, ctx) => {
  const { sentence, course } = input;

  const messages = `Analiza sintácticamente la siguiente oración para alumnos de ${course}, mostrando el procedimiento paso a paso (estilo "cómo lo razonaría el profesor en la pizarra").

Oración:
"${sentence}"

Devuelve un texto en español de España estructurado con:

1. Análisis morfológico previo de los núcleos (sustantivo, verbo, etc., con categoría y rasgos relevantes)
2. Identificación del verbo principal y predicado
3. Determinación del sujeto (incluyendo prueba de concordancia)
4. Análisis del predicado: tipo, núcleo y complementos (CD, CI, CC, Atrib., CRég., CPred., CAg.), con justificación de cada uno y prueba de sustitución pronominal cuando proceda
5. Si hay subordinadas, análisis del nexo y de la función de la subordinada respecto a la principal
6. Esquema final del análisis (en formato de árbol indentado o de paréntesis etiquetados)
7. Errores frecuentes que el profesor debe vigilar al corregir este tipo de oración

Mantén la terminología de la RAE / NGLE.`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'text', output: text };
};

// len_eso.commentary — commentary
exports.commentary = async (input, ctx) => {
  const { text_or_reference, course } = input;

  const messages = `Prepara un comentario de texto guiado del siguiente texto o referencia, para alumnos de ${course}.

Texto/referencia:
"""
${text_or_reference}
"""

Devuelve JSON estricto con este formato:
{
  "title": "Título descriptivo del comentario",
  "source_text": "el texto a comentar (si la entrada es una referencia, transcríbelo o resúmelo en 6-10 frases manteniendo el sentido)",
  "context": "contexto del autor, época, género y obra (3-5 frases)",
  "key_concepts": [
    { "term": "término literario o lingüístico", "definition": "definición breve" }
  ],
  "commentary_paragraphs": [
    "1. Tema e ideas principales",
    "2. Estructura interna del texto",
    "3. Análisis lingüístico-estilístico (figuras, registro, sintaxis relevante)",
    "4. Interpretación y juicio crítico"
  ],
  "guiding_questions": [
    "pregunta literal sobre el contenido",
    "pregunta inferencial sobre el sentido",
    "pregunta de aplicación / juicio personal"
  ]
}

Todo en español de España, con terminología técnica del curso correspondiente.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2600,
  });
  return { output_kind: 'commentary', output: result };
};

// len_eso.writing — text
exports.writing = async (input, ctx) => {
  const { course, mode, prompt_or_text } = input;

  if (mode === 'correct') {
    const messages = `Corrige la siguiente redacción de un alumno de ${course}. Trato pedagógico: no reescribir todo, marcar y razonar.

Redacción:
"""
${prompt_or_text}
"""

Devuelve un texto en español de España estructurado con:

1. Resumen valorativo (3-4 frases: qué funciona, qué hay que mejorar)
2. Tabla de errores (categoría: ortografía / léxico / sintaxis / cohesión / coherencia / adecuación — cita la zona del texto y propone la corrección)
3. Comentario sobre la estructura del texto (introducción, desarrollo, cierre)
4. Comentario sobre el registro y la voz
5. 3 sugerencias concretas de mejora priorizadas
6. Nota orientativa sobre 10 con desglose por dimensiones
7. Una pregunta de reescritura: qué párrafo concreto debería reescribir el alumno y con qué objetivo`;
    const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2200 });
    return { output_kind: 'text', output: text };
  }

  const messages = `Propón una tarea de redacción guiada para alumnos de ${course} sobre el tema o género: "${prompt_or_text}".

Devuelve un texto en español de España estructurado con:

1. Título de la tarea
2. Contexto comunicativo (a quién se dirige, con qué intención, en qué soporte)
3. Tipo de texto y extensión orientativa
4. Andamiaje retórico (estructura, conectores típicos, recursos esperables)
5. Plantilla con esqueleto (introducción / desarrollo / conclusión, con preguntas-guía por sección)
6. Vocabulario sugerido (8-12 términos)
7. Lista de revisión del alumno (checklist de 6 ítems)
8. Indicadores de evaluación (4 dimensiones con descriptores)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};
