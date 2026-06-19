const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres profesor de Educación Física en un IES español, con criterio LOMLOE. ' +
  'Escribes en español de España, con vocabulario técnico-deportivo y enfoque saludable. ' +
  'Tus propuestas son realistas para un pabellón o patio con material estándar. ' +
  'Cuidas la inclusión y la seguridad. Nada de relleno, nada de emojis.';

// efi_eso.sessions — text
exports.sessions = async (input, ctx) => {
  const { course, content_block, duration_minutes = 55 } = input;

  const messages = `Diseña una sesión completa de Educación Física para alumnos de ${course} sobre el bloque "${content_block}". Duración: ${duration_minutes} minutos.

Devuelve un texto en español de España estructurado con:

1. Objetivos competenciales (2-3)
2. Materiales (lista cerrada, propia de un IES público)
3. Instalación
4. Calentamiento (8-10 min, descripción y disposición)
5. Parte principal (3 tareas progresivas; cada una con tiempo, organización, explicación y variantes +/− dificultad)
6. Vuelta a la calma (5-8 min)
7. Atención a la diversidad (alumnado con lesión, NEE o desmotivado: variantes específicas)
8. Indicadores de evaluación observables (3-4)
9. Riesgos a vigilar`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

// efi_eso.theory — text
exports.theory = async (input, ctx) => {
  const { course, topic } = input;

  const messages = `Elabora una explicación didáctica de contenidos teóricos sobre "${topic}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Idea-eje del tema (1-2 frases)
2. Conceptos clave (5-8 con definición breve)
3. Explicación (3-4 párrafos, con ejemplos deportivos reales o de su vida cotidiana)
4. Conexión con la salud y los hábitos del adolescente
5. Aplicación práctica: cómo se traslada esta teoría a la práctica en clase de EF
6. Actividades de comprensión (4: literal, inferencial, aplicación y respuesta personal)
7. Para saber más: 1-2 recursos accesibles`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

// efi_eso.rubric — rubric
exports.rubric = async (input, ctx) => {
  const { course, activity, criteria_count = 5 } = input;

  const messages = `Construye una rúbrica de evaluación para "${activity}" en ${course} (Educación Física).

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
        { "label": "Iniciado",   "descriptor": "..." },
        { "label": "En proceso", "descriptor": "..." },
        { "label": "Adecuado",   "descriptor": "..." },
        { "label": "Avanzado",   "descriptor": "..." }
      ]
    }
  ]
}

Crea ${criteria_count} criterios (pesos sumando 100). Equilibra criterios técnicos, tácticos, actitudinales y de progreso personal. Descriptores observables. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2400,
  });
  return { output_kind: 'rubric', output: result };
};
