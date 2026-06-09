const { callClaude, callClaudeJSON } = require('../claudeService');

const STAGE_AUDIENCE = {
  ingles_primaria: 'alumnos de Educación Primaria (6-12 años) en un colegio español',
  ingles_eso:      'alumnos de ESO (12-16 años) en un colegio español',
};

const audienceFor = (moduleId) => STAGE_AUDIENCE[moduleId] || 'alumnos de inglés';

// ingles.writing — text
exports.writing = async (input, ctx) => {
  const { level, mode, prompt_or_text } = input;
  const audience = audienceFor(ctx.moduleId);

  const system =
    'Eres profesor de inglés en un colegio español. Escribes con claridad y precisión, en español de España. ' +
    'Tus respuestas son útiles para llevar directamente al aula: sin relleno, sin emojis, sin metacomentarios.';

  const messages =
    mode === 'correct'
      ? `Corrige la siguiente redacción de un alumno (${audience}), nivel ${level}.
Devuelve un texto estructurado con estas secciones, en español de España:

1. Texto original
2. Texto corregido (limpio, sin marcas)
3. Errores detectados (lista con: tipo de error, fragmento original, corrección, breve explicación)
4. Aspectos positivos
5. Sugerencias de mejora
6. Puntuación orientativa sobre 10 con justificación breve

Redacción del alumno:
"""
${prompt_or_text}
"""`
      : `Propón una redacción guiada para ${audience}, nivel ${level}, sobre el tema/contexto: "${prompt_or_text}".
Devuelve un texto estructurado en español de España con:

1. Enunciado de la redacción (en inglés, dirigido al alumno, con extensión mínima/máxima recomendada)
2. Objetivos de aprendizaje (gramática, vocabulario, funciones comunicativas)
3. Guion sugerido (3-5 puntos a desarrollar)
4. Vocabulario clave y conectores recomendados (en inglés, con traducción al castellano)
5. Rúbrica breve de evaluación (4 criterios, 0-2 puntos cada uno)`;

  const text = await callClaude({ system, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

const JSON_SYSTEM =
  'Eres profesor de inglés en un colegio español. Generas material didáctico de calidad. ' +
  'Devuelves SIEMPRE y SOLO un objeto JSON válido, sin envolverlo en markdown, sin comentarios. ' +
  'En español de España donde proceda; los enunciados de los ejercicios pueden ir en inglés.';

// ingles.exercises — exercise_set
exports.exercises = async (input, ctx) => {
  const { level, topic, count = 10 } = input;
  const audience = audienceFor(ctx.moduleId);

  const messages = `Genera ${count} ejercicios de inglés para ${audience}, nivel ${level}, sobre el tema "${topic}".

Devuelve JSON estricto con este formato:
{
  "title": "string en español",
  "level": "${level}",
  "topic": "${topic}",
  "exercises": [
    {
      "id": 1,
      "type": "fill_blank" | "multiple_choice" | "transform" | "matching",
      "prompt": "enunciado en inglés",
      "options": ["A","B","C","D"],   // sólo en multiple_choice/matching
      "answer": "respuesta correcta",
      "explanation": "explicación breve en español"
    }
  ]
}

Varía los tipos. Las opciones de multiple_choice deben ser plausibles (no chistosas).`;

  const result = await callClaudeJSON({
    system: JSON_SYSTEM, messages, model: 'haiku', maxTokens: 2500,
  });
  return { output_kind: 'exercise_set', output: result };
};

// ingles.reading — exercise_set (texto + preguntas)
exports.reading = async (input, ctx) => {
  const { level, topic, question_count = 8 } = input;
  const audience = audienceFor(ctx.moduleId);

  const messages = `Crea una actividad de comprensión lectora para ${audience}, nivel ${level}${topic ? `, temática "${topic}"` : ''}.

Devuelve JSON estricto con este formato:
{
  "title": "string en español",
  "level": "${level}",
  "passage": "texto en inglés adaptado al nivel (150-250 palabras para A1-A2, 250-400 para B1-B2)",
  "exercises": [
    {
      "id": 1,
      "type": "multiple_choice" | "true_false" | "open",
      "prompt": "pregunta en inglés",
      "options": ["A","B","C","D"],   // solo en multiple_choice; ["True","False"] en true_false
      "answer": "respuesta correcta",
      "explanation": "justificación breve citando la parte del texto, en español"
    }
  ]
}

Genera ${question_count} preguntas. Mezcla literal, inferencial y vocabulario.`;

  const result = await callClaudeJSON({
    system: JSON_SYSTEM, messages, model: 'haiku', maxTokens: 2500,
  });
  return { output_kind: 'exercise_set', output: result };
};
