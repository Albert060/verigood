const { callClaudeJSON } = require('./claudeService');
const { aiAvailable } = require('../utils/aiAvailable');
const fixtures = require('./demoFixtures');

const generatePresentation = async ({ sourceText, level, unit, subject = 'cambridge', outputTypes = ['slides', 'notebooklm'] }) => {
  if (!aiAvailable()) {
    return fixtures.cambridgePresentation({ sourceText, level });
  }

  const system = `You are an expert educational content designer and language teacher.
Always respond with valid JSON only.`;

  const subjectContexts = {
    cambridge: `Cambridge English ${level} class`,
    espanol: 'Lengua Castellana class',
    matematicas: 'Mathematics class',
    medio: 'Conocimiento del Medio class',
  };

  const prompt = `Analyze this educational content and generate:
${outputTypes.includes('slides') ? '1. A structured slide outline (8-12 slides)' : ''}
${outputTypes.includes('summary') ? '2. A concise summary for students' : ''}
${outputTypes.includes('notebooklm') ? '3. An optimized prompt for Google NotebookLM' : ''}

Content:
---
${sourceText.slice(0, 4000)}
---

Context: ${subjectContexts[subject] || subject}, ${level ? `Level: ${level}` : ''}, ${unit ? `Unit: ${unit}` : ''}

Return JSON with: title, slides (array of {number,title,keyPoints,speakerNotes}), summary, notebooklmPrompt, vocabularyList, discussionQuestions.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'sonnet', maxTokens: 4096 });
};

const generateThematicSheet = async ({ topic, grade, subtopics }) => {
  if (!aiAvailable()) {
    return fixtures.medioSheet({ topic, grade });
  }

  const system = `You are an expert primary school teacher. Always respond with valid JSON only.`;
  const prompt = `Generate a thematic sheet.
Topic: ${topic}
Grade: ${grade}
Subtopics: ${(subtopics || []).join(', ')}

Return JSON: { title, grade, intro, sections:[{title,body,bullets}], questions:[strings] }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 3000 });
};

module.exports = { generatePresentation, generateThematicSheet };
