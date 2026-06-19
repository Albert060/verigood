const { callClaude, callClaudeJSON } = require('../claudeService');

const SYSTEM =
  'Eres maestro de Conocimiento del medio natural, social y cultural en Primaria, en un colegio español, ' +
  'con criterio LOMLOE. Escribes en español de España, con rigor científico y vocabulario adaptado al curso. ' +
  'Integras lo natural, lo social y lo cultural. Nada de relleno, nada de emojis.';

// med_prim.sheets — text
exports.sheets = async (input, ctx) => {
  const { course, topic } = input;

  const messages = `Elabora una ficha temática sobre "${topic}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Título
2. Conceptos clave (lista de 5-8 términos con definición breve adaptada al curso)
3. Explicación didáctica (3-4 párrafos cortos, con ejemplos cercanos al alumno español)
4. Conexión con el entorno (cómo se observa esto en su pueblo/ciudad/país)
5. Mini-glosario visual (3-4 elementos que el alumno deba poder dibujar o identificar)
6. Actividades de comprensión (4: una de literal, una de inferencial, una de aplicación, una de creación)
7. Para saber más (1-2 lecturas, vídeos o salidas sugeridas, reales y accesibles)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};

// med_prim.quiz — quiz
exports.quiz = async (input, ctx) => {
  const { course, topic, question_count = 10 } = input;

  const messages = `Genera un cuestionario tipo test sobre "${topic}" para alumnos de ${course}.

Devuelve JSON estricto con este formato:
{
  "title": "Cuestionario: ${topic}",
  "topic": "${topic}",
  "course": "${course}",
  "questions": [
    {
      "id": 1,
      "prompt": "pregunta clara",
      "options": ["A","B","C","D"],
      "correct_index": 0,
      "explanation": "explicación breve de por qué es correcta"
    }
  ]
}

Genera ${question_count} preguntas con 4 opciones cada una. Los distractores deben ser plausibles, no absurdos. Vocabulario adaptado al curso. Todo en español de España.`;

  const result = await callClaudeJSON({
    system: SYSTEM, messages, model: 'haiku', maxTokens: 2600,
  });
  return { output_kind: 'quiz', output: result };
};

// med_prim.experiments — text
exports.experiments = async (input, ctx) => {
  const { course, topic } = input;

  const messages = `Diseña un experimento o investigación sencilla sobre "${topic}" para alumnos de ${course}.

Devuelve un texto en español de España estructurado con:

1. Pregunta investigable (formulada como pregunta del alumno, no enunciado del profesor)
2. Hipótesis a comprobar (versión sencilla adaptada al curso)
3. Materiales (cerrados, baratos, seguros para Primaria)
4. Medidas de seguridad si proceden
5. Procedimiento paso a paso (numerado, con minutos por bloque, ilustrable)
6. Cuaderno de campo del alumno (qué anotar y/o dibujar en cada paso)
7. Conclusión guiada (3 preguntas para extraer la conclusión sin que el profesor la dé hecha)
8. Conexión con la vida cotidiana (1-2 ejemplos donde se ve el mismo fenómeno)
9. Indicadores de evaluación observables (3)`;

  const text = await callClaude({ system: SYSTEM, messages, model: 'haiku', maxTokens: 1800 });
  return { output_kind: 'text', output: text };
};
