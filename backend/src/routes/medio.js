const express = require('express');
const { authenticate, requireModule } = require('../middleware/auth');
const { generateThematicSheet } = require('../services/presentationsService');
const { generateSubjectDynamics } = require('../services/dynamicsService');
const { callClaudeJSON } = require('../services/claudeService');
const { aiAvailable } = require('../utils/aiAvailable');
const fixtures = require('../services/demoFixtures');
const { query } = require('../config/database');

const router = express.Router();

const logUsage = async (userId, orgId, actionType) => {
  try {
    await query(
      `INSERT INTO usage_logs (user_id, organization_id, module, action_type) VALUES ($1, $2, 'medio', $3)`,
      [userId, orgId, actionType]
    );
  } catch (e) {}
};

// POST /medio/sheets/generate
router.post('/sheets/generate', authenticate, requireModule('medio'), async (req, res) => {
  try {
    const { topic, grade, subtopics } = req.body;
    if (!topic || !grade) return res.status(400).json({ error: 'Tema y curso son obligatorios' });

    const result = await generateThematicSheet({ topic, grade: parseInt(grade), subtopics });
    await logUsage(req.user.id, req.user.organization_id, 'sheet_generate');
    res.json(result);
  } catch (err) {
    console.error('sheet generate error:', err);
    res.status(500).json({ error: 'Error al generar la ficha' });
  }
});

// POST /medio/quizzes/generate
router.post('/quizzes/generate', authenticate, requireModule('medio'), async (req, res) => {
  try {
    const { topic, grade, count = 10, types = ['multiple_choice', 'true_false'] } = req.body;
    if (!topic || !grade) return res.status(400).json({ error: 'Tema y curso son obligatorios' });

    let result;
    if (!aiAvailable()) {
      result = fixtures.medioQuiz({ topic, grade, count });
    } else {
      const system = `Eres un experto en Ciencias Naturales y Sociales para Primaria. Responde solo con JSON válido.`;
      const prompt = `Genera un cuestionario sobre "${topic}" para ${grade}º de Primaria.
Tipos: ${types.join(', ')}. Número de preguntas: ${count}.

JSON: { topic, grade, questions:[{number,type,question,options?,answer,explanation,points}], totalPoints }.`;
      result = await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 3000 });
    }

    await logUsage(req.user.id, req.user.organization_id, 'quiz_generate');
    res.json(result);
  } catch (err) {
    console.error('quiz generate error:', err);
    res.status(500).json({ error: 'Error al generar el cuestionario' });
  }
});

// POST /medio/dynamics/generate
router.post('/dynamics/generate', authenticate, requireModule('medio'), async (req, res) => {
  try {
    const { level, topic, duration = 20, types = ['experiment', 'discovery'], count = 3 } = req.body;
    const dynamics = await generateSubjectDynamics({
      subject: 'medio',
      level,
      topic,
      duration,
      types,
      count,
    });
    await logUsage(req.user.id, req.user.organization_id, 'dynamics_generate');
    res.json({ dynamics });
  } catch (err) {
    console.error('medio dynamics error:', err);
    res.status(500).json({ error: 'Error al generar dinámicas' });
  }
});

module.exports = router;
