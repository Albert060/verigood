const { callClaudeJSON } = require('./claudeService');
const { aiAvailable } = require('../utils/aiAvailable');
const fixtures = require('./demoFixtures');

const DYNAMIC_TYPES = {
  vocabulary: 'Vocabulary Activity',
  speaking: 'Speaking Activity',
  reading: 'Reading Activity',
  writing: 'Writing Activity',
  listening: 'Listening Activity',
  grammar: 'Grammar Activity',
  warmup: 'Warm-up Activity',
  review: 'Review Activity',
};

const generateDynamics = async ({ level, topic, duration, types, resources, count = 3 }) => {
  if (!aiAvailable()) {
    return fixtures.cambridgeDynamics({ level, topic, count, duration, types });
  }

  const typeLabels = types.map((t) => DYNAMIC_TYPES[t] || t).join(', ');
  const resourceLabels = (resources || []).join(', ');

  const system = `You are an experienced Cambridge English teacher and teacher trainer.
Generate creative, practical classroom activities that teachers can use immediately.
Always respond with valid JSON only.`;

  const prompt = `Generate ${count} classroom activities for a ${level} Cambridge English class.

Context:
- Topic: ${topic || 'general English'}
- Duration per activity: ${duration} minutes
- Activity types: ${typeLabels}
- Available resources: ${resourceLabels || 'standard classroom'}

Return JSON array. Each item: title, type, typeLabel, duration, grouping, description, instructions (array), languageFocus, materialsNeeded, teacherTip.`;

  const dynamics = await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 3000 });
  return Array.isArray(dynamics) ? dynamics : dynamics.activities || [];
};

const generateSubjectDynamics = async ({ subject, level, topic, duration, types, count = 3 }) => {
  if (!aiAvailable()) {
    if (subject === 'espanol') return fixtures.lenguaDynamics({ count, level, topic });
    if (subject === 'medio') return fixtures.medioDynamics({ count, level, topic });
    return fixtures.cambridgeDynamics({ level, topic, count, duration, types });
  }

  const subjectContexts = {
    espanol: 'Spanish Language and Literature class (Lengua Castellana)',
    matematicas: 'Mathematics class',
    medio: 'Natural and Social Science class (Conocimiento del Medio)',
  };

  const system = `You are an expert ${subject} teacher and pedagogy specialist. Always respond with valid JSON only.`;
  const prompt = `Generate ${count} classroom activities for a ${subjectContexts[subject] || subject} class.
Level: ${level}
Topic: ${topic || 'general'}
Duration: ${duration} minutes
Types: ${(types || []).join(', ')}

Return JSON array with: title, type, typeLabel, duration, grouping, description, instructions, materialsNeeded, teacherTip.`;

  const dynamics = await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 3000 });
  return Array.isArray(dynamics) ? dynamics : dynamics.activities || [];
};

module.exports = { generateDynamics, generateSubjectDynamics, DYNAMIC_TYPES };
