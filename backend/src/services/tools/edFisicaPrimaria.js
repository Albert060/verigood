const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres maestro de Educación Física en Primaria, en un colegio español, con criterio LOMLOE. ' +
  'Escribes en español de España, con vocabulario técnico-deportivo adaptado al curso. ' +
  'Tus propuestas son realistas para un patio o un pabellón con material estándar de colegio. ' +
  'Cuidas la inclusión y la seguridad. Nada de relleno, nada de emojis.';

// efi_prim.sessions — text
exports.sessions = async (input, ctx) => {
  const { course, content_block, duration_minutes = 50 } = input;

  const messages = `Diseña una sesión completa de Educación Física para alumnos de ${course} sobre el bloque "${content_block}". Duración total: ${duration_minutes} minutos.

Devuelve un texto en español de España estructurado con:

1. Objetivos de aprendizaje (2-3 competenciales)
2. Materiales (cerrados, propios de un colegio público español)
3. Instalación (patio / pabellón / gimnasio)
4. Calentamiento (5-8 min, descripción y disposición)
5. Parte principal (3 tareas progresivas, con tiempo y explicación; incluye variantes para más fácil / más difícil)
6. Vuelta a la calma (5 min, descripción)
7. Atención a la diversidad (variantes para alumnado con dificultades motrices o NEE)
8. Indicadores de evaluación observables (3-4)
9. Riesgos a vigilar (lista breve)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

// efi_prim.games — text
exports.games = async (input, ctx) => {
  const { course, skill, count = 4 } = input;

  const messages = `Propón ${count} juegos motrices para desarrollar "${skill}" en alumnos de ${course}.

Para cada juego, en español de España, indica:

1. Nombre del juego
2. Objetivo motriz que trabaja
3. Materiales y espacio necesario
4. Nº de jugadores y disposición
5. Reglas explicadas paso a paso
6. Variantes para subir o bajar dificultad
7. Adaptación inclusiva (cómo participa un alumno con movilidad reducida)
8. Indicadores de observación para el profesor

Separa cada juego con una línea ("---") para que se lean como fichas independientes.`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

// efi_prim.rubric — rubric
exports.rubric = async (input, ctx) => {
  const { course, activity, criteria_count = 5 } = input;

  const messages = `Construye una rúbrica de evaluación para "${activity}" en ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Rúbrica: ${activity}",
  "context": "${course} — Educación Física",
  "scale": ["Iniciado","En proceso","Adecuado","Avanzado"],
  "criteria": [
    {
      "name": "Criterio observable (verbo de acción)",
      "weight": 25,
      "levels": [
        { "label": "Iniciado",    "descriptor": "descripción del nivel" },
        { "label": "En proceso",  "descriptor": "descripción del nivel" },
        { "label": "Adecuado",    "descriptor": "descripción del nivel" },
        { "label": "Avanzado",    "descriptor": "descripción del nivel" }
      ]
    }
  ]
}

Crea ${criteria_count} criterios. Cada criterio con su peso (la suma de pesos = 100). Los descriptores deben ser observables, no juicios subjetivos. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2400,
  });
  return { output_kind: 'rubric', output: result };
};
