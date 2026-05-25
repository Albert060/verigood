const { callClaudeJSON } = require('./claudeService');
const { aiAvailable } = require('../utils/aiAvailable');
const fixtures = require('./demoFixtures');

const generateExercises = async ({ type, level, topic, count = 5 }) => {
  if (!aiAvailable()) {
    return fixtures.lenguaExercises({ type, level, topic, count });
  }

  const system = `Eres un experto en Lengua Castellana. Genera ejercicios pedagógicos.
Responde con JSON válido únicamente.`;

  const prompt = `Genera ${count} ejercicios de "${type}" para nivel ${level}.
${topic ? `Contexto: ${topic}` : ''}

JSON: { type, level, exercises:[{number,title,content,instructions,answer,explanation,points}], teacherNotes }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 3000 });
};

const correctEssay = async ({ text, level, type = 'redaccion', rubric }) => {
  if (!aiAvailable()) {
    return fixtures.lenguaEssay({ text });
  }

  const system = `Eres un profesor experto de Lengua. Corrige redacciones con feedback constructivo.
Responde con JSON válido únicamente.`;

  const prompt = `Corrige esta redacción de nivel ${level}:

---
${text}
---

Tipo: ${type}
${rubric ? `Criterios: ${rubric}` : ''}

JSON: { totalScore, maxScore, grade, categories, errors, strengths, improvements, overallFeedback, correctedText }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 3000 });
};

const analyzeSyntax = async ({ sentence, level }) => {
  if (!aiAvailable()) {
    return fixtures.lenguaSyntax({ sentence });
  }

  const system = `Eres un experto en gramática española. Análisis sintáctico completo.
Responde con JSON válido únicamente.`;

  const prompt = `Analiza sintácticamente para nivel ${level}: "${sentence}"

JSON: { sentence, type, subject:{...}, predicate:{...}, morphologicalAnalysis:[...], teacherNotes }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 2000 });
};

const generateCommentary = async ({ text, level, type = 'literario' }) => {
  if (!aiAvailable()) {
    return fixtures.lenguaCommentary({ text, level, type });
  }

  const system = `Experto en comentario de textos literarios y no literarios.
Responde con JSON válido únicamente.`;

  const prompt = `Genera guía de comentario para nivel ${level} (${type}):

---
${(text || '').slice(0, 2000)}
---

JSON: { title, level, intro, sections:[{title,body,bullets}], questions:[strings] }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'sonnet', maxTokens: 3000 });
};

module.exports = { generateExercises, correctEssay, analyzeSyntax, generateCommentary };
