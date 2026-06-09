const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Educación Plástica en un colegio español, sensibilidad LOMLOE. ' +
  'Escribes en español de España, con criterio pedagógico real y enfoque competencial. ' +
  'Nada de relleno, nada de emojis, nada de "esperamos que disfruten".';

// plastica.projects — text
exports.projects = async (input, ctx) => {
  const { course, theme, duration_sessions = 2 } = input;

  const messages = `Diseña una propuesta de proyecto de plástica para ${course}, sobre el tema "${theme}", a desarrollar en ${duration_sessions} sesiones de 45 minutos.

Devuelve un texto en español de España estructurado con:

1. Título del proyecto
2. Objetivos competenciales (3-4, vinculados al currículo LOMLOE de Primaria)
3. Materiales necesarios (lista cerrada, asumible en el aula)
4. Desarrollo por sesiones (paso a paso, con minutaje aproximado)
5. Producto final esperado del alumno
6. Diferenciación: apoyo para alumnos con dificultades + ampliación para alumnos avanzados
7. Indicadores de evaluación (3 criterios observables)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

// plastica.rubric — rubric
exports.rubric = async (input, ctx) => {
  const { project_title, criteria_count = 5 } = input;

  const messages = `Diseña una rúbrica de evaluación para el proyecto de plástica "${project_title}", con ${criteria_count} criterios.

Devuelve JSON estricto con este formato:
{
  "title": "Rúbrica: ${project_title}",
  "criteria": [
    {
      "name": "nombre breve del criterio",
      "description": "qué se evalúa, en una frase",
      "levels": [
        { "level": "Excelente",  "points": 4, "descriptor": "qué hace exactamente el alumno para obtener este nivel" },
        { "level": "Notable",    "points": 3, "descriptor": "..." },
        { "level": "Suficiente", "points": 2, "descriptor": "..." },
        { "level": "Insuficiente","points": 1, "descriptor": "..." }
      ]
    }
  ]
}

Todo en español de España. Los descriptores deben ser observables, no abstractos.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2200,
  });
  return { output_kind: 'rubric', output: result };
};
