const { callClaudeJSON } = require('./claudeService');
const { aiAvailable } = require('../utils/aiAvailable');
const fixtures = require('./demoFixtures');

const TOPICS = {
  primaria: ['operaciones_basicas', 'fracciones', 'decimales', 'geometria', 'medidas', 'estadistica_basica'],
  eso: ['algebra', 'funciones', 'geometria', 'estadistica', 'probabilidad', 'numeros', 'ecuaciones'],
  bachillerato: ['calculo', 'algebra_lineal', 'estadistica', 'probabilidad', 'geometria_analitica', 'trigonometria'],
};

const generateProblems = async ({ level, topic, difficulty, count = 5, withSolutions = true }) => {
  if (!aiAvailable()) {
    return fixtures.matematicasProblems({ level, topic, difficulty, count });
  }

  const system = `Eres profesor experto de Matemáticas. Genera problemas correctos y bien redactados.
Responde con JSON válido únicamente.`;

  const prompt = `Genera ${count} problemas de ${topic} para ${level}, dificultad ${difficulty}.
${withSolutions ? 'Incluye solución paso a paso.' : 'Solo enunciado.'}

JSON: { topic, level, difficulty, problems:[{number,statement,steps:[strings],answer,points}], teacherNotes, commonMistakes }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 4096 });
};

const correctMathWork = async ({ extractedText, level, topic }) => {
  if (!aiAvailable()) {
    return fixtures.matematicasOcr();
  }

  const system = `Eres profesor de Matemáticas. Identifica errores con precisión.
Responde con JSON válido únicamente.`;

  const prompt = `Analiza este trabajo (${level}, ${topic}):

---
${extractedText}
---

JSON: { totalScore, maxScore, exercises:[...], strengths, improvements, overallFeedback }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 2500 });
};

const generateSeries = async ({ level, topic, count = 20, difficulty }) => {
  if (!aiAvailable()) {
    return fixtures.matematicasSeries({ topic, level, difficulty, count });
  }

  const system = `Profesor experto. Genera series de práctica con dificultad progresiva.
Responde con JSON válido únicamente.`;

  const prompt = `Genera serie de ${count} ejercicios de ${topic} para ${level}, ${difficulty}.

JSON: { topic, series:[{number,exercise,answer,difficulty}], instructions, timeEstimate }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 3000 });
};

module.exports = { generateProblems, correctMathWork, generateSeries, TOPICS };
