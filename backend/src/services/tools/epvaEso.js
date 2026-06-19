const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Educación Plástica, Visual y Audiovisual (EPVA) en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España, con sensibilidad estética, rigor visual y vocabulario técnico ' +
  'adecuado al curso. Cuidas la mirada crítica y la diversidad cultural. Nada de relleno, nada de emojis.';

// epva.projects — text
exports.projects = async (input, ctx) => {
  const { course, theme, duration_sessions = 4 } = input;

  const messages = `Diseña un proyecto visual o audiovisual sobre "${theme}" para alumnos de ${course}, con duración de ${duration_sessions} sesiones.

Devuelve un texto en español de España estructurado con:

1. Título y producto final (obra plástica, fotografía, vídeo corto, instalación…)
2. Intención comunicativa (qué quiere transmitir el alumno con la obra)
3. Referente artístico (autor/movimiento real con 1-2 frases de contexto y por qué encaja con el reto)
4. Objetivos competenciales (2-3 LOMLOE)
5. Conceptos visuales clave a trabajar (composición, color, encuadre, ritmo… los relevantes)
6. Materiales y herramientas (lista cerrada, realista para un IES público)
7. Secuencia por sesiones (objetivo, actividad, producto parcial, minutos)
8. Atención a la diversidad: variante de menor exigencia técnica + reto de ampliación
9. Muestra final (cómo se expone o presenta la obra)
10. Indicadores de evaluación observables (4 dimensiones: técnica, expresividad, originalidad, proceso)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 2000 });
  return { output_kind: 'text', output: text };
};

// epva.rubric — rubric
exports.rubric = async (input, ctx) => {
  const { course, activity, criteria_count = 5 } = input;

  const messages = `Construye una rúbrica para "${activity}" en ${course} (EPVA).

Devuelve JSON estricto con este formato:
{
  "title": "Rúbrica: ${activity}",
  "context": "${course} — EPVA",
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

Crea ${criteria_count} criterios (pesos sumando 100). Mezcla técnica (ejecución, dominio del medio), expresividad (intención, originalidad) y proceso (planificación, autoevaluación). Descriptores observables. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2400,
  });
  return { output_kind: 'rubric', output: result };
};

// epva.analysis — commentary
exports.analysis = async (input, ctx) => {
  const { course, work_or_reference } = input;

  const messages = `Prepara un análisis guiado de la siguiente obra visual o audiovisual para alumnos de ${course}.

Obra / referencia del profesor:
"""
${work_or_reference}
"""

Devuelve JSON estricto con este formato:
{
  "title": "Título descriptivo del análisis",
  "source_text": "ficha de la obra: autor, año, técnica, dimensiones/duración, dónde se conserva o publica. Si la entrada es solo una referencia, complétala con datos contrastables.",
  "context": "contexto histórico, movimiento, intención del autor (3-5 frases)",
  "key_concepts": [
    { "term": "concepto plástico/audiovisual", "definition": "definición breve" }
  ],
  "commentary_paragraphs": [
    "1. Descripción objetiva (qué vemos)",
    "2. Análisis de los elementos visuales (composición, color, luz, ritmo…)",
    "3. Significado y simbología",
    "4. Juicio crítico y conexión con la mirada actual del adolescente"
  ],
  "guiding_questions": [
    "pregunta de observación literal",
    "pregunta de interpretación de los elementos visuales",
    "pregunta de respuesta personal y crítica"
  ]
}

Todo en español de España. Sé riguroso con datos verificables; si dudas, indícalo en la ficha en vez de inventar.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2400,
  });
  return { output_kind: 'commentary', output: result };
};
