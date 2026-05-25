const express = require('express');
const { authenticate, requireModule } = require('../middleware/auth');
const { generateExercises, correctEssay, analyzeSyntax, generateCommentary } = require('../services/lenguaService');
const { generateDynamics: generateSubjectDynamics } = require('../services/dynamicsService');
const { query } = require('../config/database');

const router = express.Router();

const logUsage = async (userId, orgId, actionType) => {
  try {
    await query(
      `INSERT INTO usage_logs (user_id, organization_id, module, action_type) VALUES ($1, $2, 'espanol', $3)`,
      [userId, orgId, actionType]
    );
  } catch (e) {}
};

// POST /lengua/exercises/generate
router.post('/exercises/generate', authenticate, requireModule('espanol'), async (req, res) => {
  try {
    const { type: typeIn, types, level: lvlIn, course, topic, count = 5 } = req.body;
    const type = typeIn || (Array.isArray(types) ? types[0] : types);
    const level = lvlIn || course;
    if (!type || !level) return res.status(400).json({ error: 'Tipo y nivel son obligatorios' });

    const result = await generateExercises({ type, level, topic, count });
    await logUsage(req.user.id, req.user.organization_id, 'exercises_generate');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar ejercicios' });
  }
});

// POST /lengua/essays/correct
router.post('/essays/correct', authenticate, requireModule('espanol'), async (req, res) => {
  try {
    const { text, level: lvlIn, course, type, rubric } = req.body;
    const level = lvlIn || course;
    if (!text || text.trim().length < 20) return res.status(400).json({ error: 'Texto demasiado corto' });

    const result = await correctEssay({ text, level, type, rubric });
    await logUsage(req.user.id, req.user.organization_id, 'essay_correct');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al corregir la redacción' });
  }
});

// POST /lengua/syntax/analyze
router.post('/syntax/analyze', authenticate, requireModule('espanol'), async (req, res) => {
  try {
    const { sentence, level } = req.body;
    if (!sentence) return res.status(400).json({ error: 'La oración es obligatoria' });

    const result = await analyzeSyntax({ sentence, level });
    await logUsage(req.user.id, req.user.organization_id, 'syntax_analyze');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al analizar la oración' });
  }
});

// POST /lengua/commentary/generate
router.post('/commentary/generate', authenticate, requireModule('espanol'), async (req, res) => {
  try {
    const { text, level, type } = req.body;
    if (!text || text.trim().length < 50) return res.status(400).json({ error: 'Texto demasiado corto' });

    const result = await generateCommentary({ text, level, type });
    await logUsage(req.user.id, req.user.organization_id, 'commentary_generate');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar el comentario' });
  }
});

// POST /lengua/dynamics/generate
router.post('/dynamics/generate', authenticate, requireModule('espanol'), async (req, res) => {
  try {
    const { level, topic, duration = 15, types = ['speaking'], count = 3 } = req.body;
    const dynamics = await generateSubjectDynamics({ subject: 'espanol', level, topic, duration, types, count });
    await logUsage(req.user.id, req.user.organization_id, 'dynamics_generate');
    res.json({ dynamics });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar dinámicas' });
  }
});

module.exports = router;
