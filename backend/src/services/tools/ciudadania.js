const { callClaude } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Educación para la Ciudadanía en Primaria, en un colegio español. ' +
  'Escribes en español de España. Tu enfoque es plural, dialógico y respetuoso con la pluralidad ' +
  'ideológica. Nada de sesgo partidista, nada de adoctrinamiento. Nada de relleno ni emojis.';

// ciudadania.debate — text
exports.debate = async (input, ctx) => {
  const { topic, course } = input;

  const messages = `Diseña un debate guiado para alumnos de ${course} sobre el tema "${topic}".

Devuelve un texto en español de España estructurado con:

1. Pregunta-eje del debate (clara, abierta, sin respuesta obvia)
2. Contexto breve para enmarcar el tema (3-4 frases, neutro)
3. Posturas a representar (mínimo 2, idealmente 3; cada una con resumen, argumentos principales, y posibles contraargumentos)
4. Vocabulario clave que los alumnos deben manejar (4-6 términos con definición breve)
5. Estructura de la sesión paso a paso (preparación en grupos, turnos, puesta en común, cierre — con minutos por bloque)
6. Preguntas moderadoras del profesor (5 preguntas para reactivar el debate cuando decaiga)
7. Reglas básicas de respeto y turno de palabra
8. Cierre: actividad de síntesis individual (escrita o oral)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

// ciudadania.case — text
exports.case_ = async (input, ctx) => {
  const { theme, course } = input;

  const messages = `Redacta un caso práctico con dilema ético sobre "${theme}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Título del caso
2. Narración del caso (8-12 líneas, personajes con nombre, situación verosímil y cercana a su edad)
3. El dilema (formulado como pregunta clara, sin solución evidente)
4. Información adicional relevante (3-4 datos que el profesor puede revelar para complicar el dilema)
5. Preguntas guía para el análisis (5 preguntas: hechos, valores en juego, consecuencias, alternativas, decisión razonada)
6. Posibles respuestas tipo (2-3 enfoques diferentes razonados, sin etiquetarlos como "el correcto")
7. Indicadores de evaluación (3 criterios observables: argumentación, respeto a otras posturas, conexión con valores cívicos)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};
