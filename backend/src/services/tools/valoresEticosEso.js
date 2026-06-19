const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Educación en Valores Éticos en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España. Tu enfoque es plural, dialógico y respetuoso con la diversidad ' +
  'ideológica, religiosa y cultural. Nada de sesgo partidista, nada de adoctrinamiento. ' +
  'Manejas con rigor las grandes corrientes éticas (deontología, utilitarismo, ética de la virtud, ' +
  'ética del cuidado). Nada de relleno, nada de emojis.';

// valores.dilemma — text
exports.dilemma = async (input, ctx) => {
  const { course, theme } = input;

  const messages = `Redacta un dilema ético sobre "${theme}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Título del dilema
2. Narración del caso (10-15 líneas, personajes con nombre, situación verosímil y cercana al adolescente, sin solución evidente)
3. Formulación del dilema como pregunta ética (¿qué debería hacer X y por qué?)
4. Información adicional que el profesor puede revelar para complicar el dilema (3-4 datos)
5. Marcos éticos en juego (al menos 2 corrientes — deontología, consecuencialismo, ética de la virtud o del cuidado — con qué dirían sobre el caso)
6. Preguntas guía para el análisis del alumno (5: hechos, valores, consecuencias, alternativas, decisión razonada)
7. Posibles respuestas tipo (2-3 enfoques diferentes, todos defendibles, sin etiquetar ninguno como "el correcto")
8. Indicadores de evaluación observables (3: argumentación, pluralismo, conexión con principios)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1900 });
  return { output_kind: 'text', output: text };
};

// valores.debate — text
exports.debate = async (input, ctx) => {
  const { course, topic } = input;

  const messages = `Diseña un debate guiado sobre "${topic}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Pregunta-eje del debate (abierta, sin respuesta obvia)
2. Contexto neutro del tema (3-4 frases)
3. Posturas a representar (mínimo 2, idealmente 3; cada una con resumen, argumentos principales con su anclaje filosófico breve, y contraargumentos previsibles)
4. Vocabulario ético clave (5-6 términos con definición)
5. Estructura de la sesión paso a paso (preparación en grupos, turnos, puesta en común, cierre — con minutos por bloque)
6. Reglas básicas del debate (respeto, escucha, prohibición de ad hominem)
7. Preguntas moderadoras del profesor (5 para reactivar el debate)
8. Cierre individual: actividad de síntesis (qué ha cambiado en su pensamiento)
9. Indicadores de evaluación (3 observables: argumentación, escucha activa, revisión de la propia postura)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1900 });
  return { output_kind: 'text', output: text };
};

// valores.commentary — commentary
exports.commentary = async (input, ctx) => {
  const { course, text_or_reference } = input;

  const messages = `Prepara un comentario guiado del siguiente texto filosófico, ensayo o fragmento, para alumnos de ${course}.

Texto / referencia:
"""
${text_or_reference}
"""

Devuelve JSON estricto con este formato:
{
  "title": "Título descriptivo",
  "source_text": "el texto a comentar (si la entrada es una referencia, transcríbelo o resúmelo en 6-10 frases manteniendo el sentido del autor)",
  "context": "autor, época, obra a la que pertenece, corriente ética (3-5 frases)",
  "key_concepts": [
    { "term": "concepto filosófico o ético", "definition": "definición breve" }
  ],
  "commentary_paragraphs": [
    "1. Tesis e ideas principales",
    "2. Estructura argumental del texto",
    "3. Marco ético en el que se inscribe (qué corriente, en qué se diferencia de otras)",
    "4. Juicio crítico y aplicación a un caso actual"
  ],
  "guiding_questions": [
    "pregunta literal sobre la tesis",
    "pregunta inferencial sobre los supuestos",
    "pregunta de aplicación: cómo respondería este texto ante un dilema actual"
  ]
}

Todo en español de España, sin imponer una postura como "verdadera".`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2400,
  });
  return { output_kind: 'commentary', output: result };
};
