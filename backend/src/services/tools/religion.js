const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Religión en un colegio español. Escribes en español de España, con respeto, ' +
  'rigor y enfoque pedagógico. Tu enfoque es competencial y de educación en valores, no doctrinal ' +
  'agresivo. Nada de relleno, nada de emojis.';

// religion.reflection — text
exports.reflection = async (input, ctx) => {
  const { theme, stage_course } = input;

  const messages = `Diseña una actividad de reflexión sobre "${theme}" para alumnos de ${stage_course}.

Devuelve un texto en español de España estructurado con:

1. Objetivo de la actividad (1-2 frases)
2. Disparador inicial (texto breve, imagen sugerida, anécdota o pregunta provocadora — algo que enganche al alumno)
3. Preguntas de reflexión personal (4 preguntas, graduadas de la más concreta a la más existencial)
4. Dinámica grupal (pequeño grupo: instrucciones, tiempo, producto que cada grupo entrega)
5. Puesta en común (3 preguntas que el profesor lanza a la clase)
6. Compromiso o gesto personal de cierre (algo aplicable a su vida cotidiana esta semana)
7. Materiales y duración total estimada`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1600 });
  return { output_kind: 'text', output: text };
};

// religion.commentary — commentary
exports.commentary = async (input, ctx) => {
  const { text_or_reference, stage_course } = input;

  const messages = `Prepara un comentario guiado del siguiente texto o referencia, para alumnos de ${stage_course}.

Texto/referencia del profesor:
"""
${text_or_reference}
"""

Devuelve JSON estricto con este formato:
{
  "title": "string en español",
  "source_text": "el texto a comentar (si la entrada es una referencia, transcríbelo o resúmelo en 4-8 frases manteniendo el sentido)",
  "context": "contexto histórico, autor, género (3-5 frases)",
  "key_concepts": [
    { "term": "concepto", "definition": "definición breve" }
  ],
  "commentary_paragraphs": [
    "primer párrafo de comentario: idea principal y estructura",
    "segundo párrafo: análisis del lenguaje y los símbolos",
    "tercer párrafo: interpretación y mensaje central",
    "cuarto párrafo: relación con valores actuales o con la experiencia del alumno"
  ],
  "guiding_questions": [
    "pregunta para el alumno (literal)",
    "pregunta para el alumno (inferencial)",
    "pregunta para el alumno (de aplicación a su vida)"
  ]
}

Todo en español de España, con respeto por la pluralidad de creencias.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2200,
  });
  return { output_kind: 'commentary', output: result };
};
