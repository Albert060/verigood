const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Tecnología y Digitalización en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España, con rigor técnico y vocabulario adaptado al curso. ' +
  'Tus propuestas integran pensamiento computacional, diseño y ciudadanía digital crítica. ' +
  'Nada de relleno, nada de emojis.';

// tec_eso.projects — text
exports.projects = async (input, ctx) => {
  const { course, theme, duration_sessions = 4 } = input;

  const messages = `Diseña un proyecto tecnológico sobre "${theme}" para alumnos de ${course}, con duración de ${duration_sessions} sesiones.

Devuelve un texto en español de España estructurado con:

1. Título y producto final (artefacto, prototipo, programa o servicio)
2. Reto-problema que motiva el proyecto (formulado como pregunta del mundo real)
3. Objetivos competenciales (2-3, alineados con LOMLOE)
4. Fases del proyecto siguiendo el método de proyectos (análisis del problema, diseño, planificación, construcción, evaluación)
5. Materiales y herramientas (lista cerrada, realista para un aula de Tecnología pública)
6. Secuencia por sesiones (objetivo, actividad, producto parcial y minutos)
7. Roles del equipo (3-4 roles con responsabilidades)
8. Atención a la diversidad: variante para alumnado con menos base técnica + reto de ampliación
9. Indicadores de evaluación observables (4 dimensiones)
10. Riesgos de seguridad y medidas`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'text', output: text };
};

// tec_eso.exercises — exercise_set
exports.exercises = async (input, ctx) => {
  const { course, topic, count = 10 } = input;

  const messages = `Genera ${count} ejercicios técnicos sobre "${topic}" para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Ejercicios: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "exercises": [
    {
      "id": 1,
      "type": "calculation" | "design" | "identify" | "multiple_choice" | "code",
      "prompt": "enunciado claro (incluye datos, esquema o fragmento de código si aplica)",
      "options": ["A","B","C","D"],
      "answer": "respuesta modelo paso a paso"
    }
  ]
}

Mezcla tipos. Adapta números, esquemas o snippets al nivel del curso. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2600,
  });
  return { output_kind: 'exercise_set', output: result };
};

// tec_eso.digital — text
exports.digital = async (input, ctx) => {
  const { course, focus } = input;

  const messages = `Diseña una actividad de competencia digital sobre "${focus}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Objetivo competencial digital (encuadrado en DigComp / LOMLOE)
2. Situación de aprendizaje (escenario realista del mundo digital del adolescente)
3. Herramientas digitales necesarias (cerradas, gratuitas, sin obligar a cuenta personal cuando sea posible)
4. Procedimiento paso a paso (numerado, con minutos)
5. Reflexión crítica (3-4 preguntas sobre privacidad, sesgos, huella digital o uso ético)
6. Producto del alumno (artefacto digital observable)
7. Indicadores de evaluación observables (3)
8. Posibles riesgos (privacidad, contenido inadecuado) y cómo mitigarlos`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};
