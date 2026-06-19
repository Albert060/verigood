const { callClaude } = require('../claudeService');

const SYSTEM =
  'Eres tutor/a en un IES español, con criterio LOMLOE y enfoque del Plan de Acción Tutorial. ' +
  'Escribes en español de España. Tu enfoque es preventivo, dialógico y centrado en el grupo. ' +
  'Cuidas la convivencia, el bienestar emocional y la pluralidad. Nada de adoctrinamiento, ' +
  'nada de relleno ni emojis.';

// tutorias.session — text
exports.session = async (input, ctx) => {
  const { course, focus, duration_minutes = 55 } = input;

  const messages = `Diseña una sesión de tutoría sobre "${focus}" para alumnos de ${course}. Duración: ${duration_minutes} minutos.

Devuelve un texto en español de España estructurado con:

1. Objetivo de la sesión (1-2 frases competenciales, centradas en lo socioemocional o convivencial)
2. Materiales (cerrados, baratos, propios de un aula)
3. Disposición del aula (círculo, grupos, individual…)
4. Apertura (5-8 min: ritual de inicio, check-in emocional o pregunta-gancho)
5. Desarrollo (2-3 actividades con tiempo, descripción y producto parcial)
6. Cierre (5-8 min: síntesis, compromiso individual o grupal de cara a la semana)
7. Atención a la diversidad (alumnado especialmente vulnerable a este tema: cómo cuidarlo)
8. Riesgos a vigilar (cuándo parar, cuándo derivar al departamento de Orientación)
9. Indicadores observables (3) para el seguimiento`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

// tutorias.dynamics — text
exports.dynamics = async (input, ctx) => {
  const { course, goal, count = 3 } = input;

  const messages = `Propón ${count} dinámicas de grupo para trabajar "${goal}" con alumnos de ${course}.

Para cada dinámica, en español de España, indica:

1. Nombre de la dinámica
2. Objetivo socioemocional o de cohesión que persigue
3. Tiempo estimado
4. Materiales
5. Disposición del aula
6. Procedimiento paso a paso
7. Reglas y consignas para los alumnos
8. Preguntas de reflexión final (3) para extraer el aprendizaje
9. Riesgos (cuándo NO usar esta dinámica) y cómo cuidar al alumnado más vulnerable
10. Variantes para subir o bajar exposición personal

Separa cada dinámica con una línea ("---") para que se lean como fichas independientes.`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'text', output: text };
};

// tutorias.conflict — text
exports.conflict = async (input, ctx) => {
  const { course, situation } = input;

  const messages = `Eres tutor/a de ${course}. Acaba de surgir esta situación de convivencia o conflicto en tu grupo:

"""
${situation}
"""

Prepara un guion de intervención. Devuelve un texto en español de España estructurado con:

1. Lectura de la situación (qué necesidades subyacen detrás del conflicto — no qué culpables)
2. Riesgos inmediatos (a la integridad, al clima del aula, a la convivencia del centro)
3. Quién interviene y cuándo (tutor/a, equipo educativo, Jefatura, Orientación, familias) — derivaciones obligadas si las hay
4. Protocolo de actuación paso a paso, en este orden:
   a. Atención inmediata si hay daño
   b. Escucha individual a cada parte (preguntas concretas que harías)
   c. Intervención con el grupo (sí o no, y por qué; si sí, cómo)
   d. Acuerdo o medida reparadora
   e. Seguimiento (qué se vigila, durante cuánto)
5. Qué comunicar a las familias y cómo
6. Registro: qué dejar por escrito y dónde
7. Una práctica restaurativa concreta aplicable
8. Errores frecuentes a evitar en esta intervención`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'text', output: text };
};
