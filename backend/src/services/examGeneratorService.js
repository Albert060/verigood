const { callClaudeJSON, resolveApiKey } = require('./claudeService');
const { query } = require('../config/database');
const { aiAvailable } = require('../utils/aiAvailable');
const fixtures = require('./demoFixtures');

const EXERCISE_TYPES = {
  multiple_choice: 'Multiple Choice',
  fill_blanks: 'Fill in the Blanks',
  true_false: 'True / False',
  error_correction: 'Error Correction',
  word_formation: 'Word Formation',
  key_word_transformation: 'Key Word Transformation',
  open_cloze: 'Open Cloze',
  matching: 'Matching',
};

/**
 * Generate a Cambridge-style exam.
 * - With API key: hybrid DB + Claude.
 * - Without API key (demo): DB if any rows match, fall back to fixtures.
 */
const generateExam = async ({ level, topic, exerciseTypes, totalQuestions, source = 'hybrid', orgId }) => {
  let dbQuestions = [];

  if (source !== 'ai_only') {
    // Filtra por module_id ('cambridge') desde la migración 008 — el enum
    // legacy `module` queda como compat para filas antiguas. Mientras
    // termina el rollout, aceptamos ambos en el OR para no romper centros
    // en los que la 008 aún no se haya aplicado.
    const dbResult = await query(
      `SELECT * FROM exam_questions
       WHERE level = $1 AND is_active = true
         AND ($2 = '' OR topic ILIKE '%' || $2 || '%')
         AND (module_id = 'cambridge' OR module = 'cambridge')
       ORDER BY RANDOM()
       LIMIT $3`,
      [level, topic || '', Math.floor(totalQuestions * 0.6)]
    );
    dbQuestions = dbResult.rows;
  }

  const remaining = totalQuestions - dbQuestions.length;
  let aiQuestions = [];
  let demoMode = false;

  if (remaining > 0) {
    if (aiAvailable(resolveApiKey())) {
      const typesToGenerate = exerciseTypes.slice(0, 3);
      const typeNames = typesToGenerate.map((t) => EXERCISE_TYPES[t] || t).join(', ');

      const system = `You are an expert Cambridge English examiner. Generate high-quality exam questions.
Always respond with valid JSON only — no markdown, no explanations.`;

      const prompt = `Generate ${remaining} Cambridge ${level} exam questions about "${topic || 'general English'}".
Exercise types to include: ${typeNames}.

Return JSON array of question objects with fields: type, question, options (if applicable), answer, explanation, points.`;

      const generated = await callClaudeJSON({ system, messages: prompt, model: 'sonnet', maxTokens: 4096 });
      aiQuestions = Array.isArray(generated) ? generated : generated.questions || [];
    } else {
      demoMode = true;
      const demo = fixtures.cambridgeExam({ level, topic, totalQuestions: remaining });
      aiQuestions = demo.questions;
    }
  }

  const allQuestions = [
    ...dbQuestions.map((q) => ({ ...q, source: 'database' })),
    ...aiQuestions.map((q) => ({
      ...q,
      source: q.source || (demoMode ? 'demo' : 'ai'),
      id: q.id || `g_${Math.random().toString(36).slice(2)}`,
    })),
  ].slice(0, totalQuestions);

  return {
    level,
    topic,
    totalQuestions: allQuestions.length,
    questions: allQuestions,
    generatedAt: new Date().toISOString(),
    dbCount: dbQuestions.length,
    aiCount: demoMode ? 0 : aiQuestions.length,
    demoMode,
  };
};

const saveExam = async ({ exam, title, teacherId, orgId }) => {
  const metadata = {
    exerciseTypes: exam.exerciseTypes || [],
    source: exam.source || 'hybrid',
    totalQuestions: Array.isArray(exam.questions) ? exam.questions.length : (exam.totalQuestions || 0),
  };
  const result = await query(
    `INSERT INTO exams (title, level, topic, questions, metadata, teacher_id, organization_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
    [
      title || `${exam.level} — ${exam.topic || 'General'} — ${new Date().toLocaleDateString('es')}`,
      exam.level,
      exam.topic,
      JSON.stringify(exam.questions),
      JSON.stringify(metadata),
      teacherId,
      orgId,
    ]
  );
  return result.rows[0].id;
};

module.exports = { generateExam, saveExam };
