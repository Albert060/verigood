const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres maestro de Educación artística (Plástica + Música) en Primaria, en un colegio español, ' +
  'con criterio LOMLOE. Escribes en español de España, con sensibilidad estética y vocabulario ' +
  'adaptado al curso. Integras lenguajes plástico y musical cuando tiene sentido. ' +
  'Nada de relleno, nada de emojis.';

// art_prim.projects — text
exports.projects = async (input, ctx) => {
  const { course, theme, duration_sessions = 3 } = input;

  const messages = `Diseña un proyecto integrado de Educación artística (plástica y/o música) sobre "${theme}" para alumnos de ${course}. Duración: ${duration_sessions} sesiones.

Devuelve un texto en español de España estructurado con:

1. Título del proyecto
2. Producto final que crea cada alumno o grupo (claro y observable)
3. Objetivos de aprendizaje (2-3, competenciales, integrando lenguajes)
4. Referente artístico inspirador (autor o obra real, una frase de contexto)
5. Materiales y recursos (cerrados, baratos, propios de un aula de Primaria)
6. Secuencia por sesiones (para cada sesión: objetivo, actividad principal, producto parcial, minutos)
7. Conexiones interdisciplinares (Lengua, Medio, Mates… concretas)
8. Atención a la diversidad: variante para alumnado con dificultades + reto creativo
9. Cierre y muestra (cómo se expone el producto final)
10. Indicadores de evaluación observables (3-4)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'text', output: text };
};

// art_prim.audition — text
exports.audition = async (input, ctx) => {
  const { course, work } = input;

  const messages = `Prepara una audición comentada de "${work}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Ficha de la obra (autor, época, género, duración aprox.)
2. Por qué esta obra para este curso (1-2 frases pedagógicas)
3. Escucha previa: vocabulario musical que el alumno debe manejar (4-6 términos breves)
4. Guion de escucha activa (segmentos o momentos a destacar, con la pregunta-gancho para cada uno)
5. Movimiento o gesto corporal que acompaña a la escucha (si encaja)
6. Conexión plástica (dibujo, color o forma que la audición sugiere — propuesta breve)
7. Preguntas de comprensión y de respuesta personal (5)
8. Producto del cuaderno (qué se queda registrado: ficha rellena, dibujo, frase)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1600 });
  return { output_kind: 'text', output: text };
};

// art_prim.rubric — rubric
exports.rubric = async (input, ctx) => {
  const { course, activity, criteria_count = 5 } = input;

  const messages = `Construye una rúbrica de evaluación para "${activity}" en ${course} (Educación artística).

Devuelve JSON estricto con este formato:
{
  "title": "Rúbrica: ${activity}",
  "context": "${course} — Educación artística",
  "scale": ["Iniciado","En proceso","Adecuado","Avanzado"],
  "criteria": [
    {
      "name": "Criterio observable",
      "weight": 25,
      "levels": [
        { "label": "Iniciado",   "descriptor": "..." },
        { "label": "En proceso", "descriptor": "..." },
        { "label": "Adecuado",   "descriptor": "..." },
        { "label": "Avanzado",   "descriptor": "..." }
      ]
    }
  ]
}

Crea ${criteria_count} criterios (pesos sumando 100). Equilibra criterios técnicos (limpieza, ejecución), expresivos (creatividad, intención) y procesuales (esfuerzo, autoevaluación). Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2400,
  });
  return { output_kind: 'rubric', output: result };
};
