const express = require('express');
const multer = require('multer');
const { authenticate, requireModule } = require('../middleware/auth');
const { generateProblems, correctMathWork, generateSeries } = require('../services/matematicasService');
const { extractTextFromImage } = require('../services/ocrCorrectorService');
const { query } = require('../config/database');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const logUsage = async (userId, orgId, actionType) => {
  try {
    await query(
      `INSERT INTO usage_logs (user_id, organization_id, module, action_type) VALUES ($1, $2, 'matematicas', $3)`,
      [userId, orgId, actionType]
    );
  } catch (e) {}
};

// POST /matematicas/problems/generate
router.post('/problems/generate', authenticate, requireModule('matematicas'), async (req, res) => {
  try {
    const { course, topics, level: lvlIn, topic: topicIn, difficulty = 'medio', count = 5, withSolutions = true } = req.body;
    const level = lvlIn || course;
    const topic = topicIn || (Array.isArray(topics) ? topics[0] : topics);
    if (!level || !topic) return res.status(400).json({ error: 'Nivel y tema son obligatorios' });

    const result = await generateProblems({ level, topic, difficulty, count, withSolutions });
    await logUsage(req.user.id, req.user.organization_id, 'problems_generate');
    res.json(result);
  } catch (err) {
    console.error('mat problems error:', err);
    res.status(500).json({ error: 'Error al generar problemas' });
  }
});

// POST /matematicas/correct/photo
router.post('/correct/photo', authenticate, requireModule('matematicas'), upload.any(), async (req, res) => {
  try {
    const file = (req.files && req.files[0]) || null;
    const { level, topic } = req.body;
    let extractedText = null;

    if (file) {
      try {
        extractedText = await extractTextFromImage(file.buffer);
      } catch (e) {
        extractedText = null;
      }
    }
    if (!extractedText) {
      extractedText = '[Modo demo — sin Google Vision configurado]\n2x + 5 = 11 → 2x = 6 → x = 3 ✓\n3(x − 2) + 5 = 2x + 4 → 3x − 6 + 5 = 2x + 4 → x = 5\nx² − 5x + 6 = 0 → (x−2)(x−3) → x = 2, 3';
    }

    const result = await correctMathWork({ extractedText, level, topic });
    await logUsage(req.user.id, req.user.organization_id, 'photo_correct');
    res.json({ ...result, extractedText });
  } catch (err) {
    console.error('mat photo error:', err);
    res.status(500).json({ error: 'Error al corregir el trabajo' });
  }
});

// POST /matematicas/series/generate
router.post('/series/generate', authenticate, requireModule('matematicas'), async (req, res) => {
  try {
    const { course, topics, level: lvlIn, topic: topicIn, count = 20, difficulty = 'medio' } = req.body;
    const level = lvlIn || course;
    const topic = topicIn || (Array.isArray(topics) ? topics[0] : topics);
    if (!level || !topic) return res.status(400).json({ error: 'Nivel y tema son obligatorios' });

    const result = await generateSeries({ level, topic, count, difficulty });
    await logUsage(req.user.id, req.user.organization_id, 'series_generate');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar la serie' });
  }
});

module.exports = router;
