const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Música en Educación Primaria en un colegio español. ' +
  'Escribes en español de España, con vocabulario didáctico preciso. Nada de relleno ni emojis.';

const FOCUS_LABEL = {
  ritmo:   'el ritmo y el pulso',
  melodia: 'la melodía y los intervalos',
  timbre:  'el timbre de instrumentos y voces',
  forma:   'la forma musical (estructura)',
  cultura: 'el contexto histórico y cultural de la obra',
};

// musica.listening — text
exports.listening = async (input, ctx) => {
  const { work, course, focus } = input;
  const focusLabel = FOCUS_LABEL[focus] || focus;

  const messages = `Diseña una actividad de escucha activa para ${course} centrada en ${focusLabel}, sobre la obra "${work}".

Devuelve un texto en español de España estructurado con:

1. Ficha de la obra (compositor, periodo, breve contexto en 2-3 frases)
2. Objetivos de la sesión (2-3 objetivos competenciales)
3. Antes de la escucha — preguntas/preparación (3 puntos)
4. Durante la escucha — pauta de observación dirigida a ${focusLabel} (4-6 indicaciones concretas)
5. Después de la escucha — preguntas de reflexión y debate (4 preguntas)
6. Actividad complementaria de creación (corta, factible en clase)
7. Materiales y duración estimada`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1500 });
  return { output_kind: 'text', output: text };
};

// musica.assessment — rubric
exports.assessment = async (input, ctx) => {
  const { activity, criteria_count = 4 } = input;

  const messages = `Diseña una rúbrica de evaluación para la actividad de música "${activity}", con ${criteria_count} criterios observables.

Devuelve JSON estricto con este formato:
{
  "title": "Evaluación: ${activity}",
  "criteria": [
    {
      "name": "nombre breve",
      "description": "qué se evalúa, en una frase",
      "levels": [
        { "level": "Excelente",   "points": 4, "descriptor": "..." },
        { "level": "Notable",     "points": 3, "descriptor": "..." },
        { "level": "Suficiente",  "points": 2, "descriptor": "..." },
        { "level": "Insuficiente","points": 1, "descriptor": "..." }
      ]
    }
  ]
}

Todo en español de España. Adapta los criterios al tipo de actividad (interpretación, audición, escrito…).`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2000,
  });
  return { output_kind: 'rubric', output: result };
};

// musica.theory — text
exports.theory = async (input, ctx) => {
  const { concept, course } = input;

  const messages = `Explica el concepto teórico-musical "${concept}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Definición clara y breve, adaptada a la edad
2. Por qué importa (en lenguaje de un niño/a de ese curso)
3. Ejemplos concretos (2-3 piezas o situaciones musicales reconocibles)
4. Ejercicio guiado paso a paso (puede ser de identificación, escritura en pentagrama, ritmo con palmas, etc.)
5. Tres preguntas de comprobación con respuesta
6. Una pequeña actividad creativa que aplique el concepto`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1500 });
  return { output_kind: 'text', output: text };
};
