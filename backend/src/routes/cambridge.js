const express = require('express');
const multer = require('multer');
const { authenticate, requireModule } = require('../middleware/auth');
const { generateExam, saveExam } = require('../services/examGeneratorService');
const { processExamImage } = require('../services/ocrCorrectorService');
const { generateDynamics } = require('../services/dynamicsService');
const { generatePresentation } = require('../services/presentationsService');
const { query } = require('../config/database');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG, PNG, WebP o PDF'), false);
    }
  },
});

// Log usage helper
const logUsage = async (userId, orgId, module, actionType, tokensUsed = 0) => {
  try {
    await query(
      `INSERT INTO usage_logs (user_id, organization_id, module, action_type, tokens_used)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, orgId, module, actionType, tokensUsed]
    );
  } catch (err) {
    console.error('logUsage error:', err);
  }
};

// ── POST /cambridge/exams/generate ──────────────────────────
router.post('/exams/generate', authenticate, requireModule('cambridge'), async (req, res) => {
  try {
    const { level, topic, exerciseTypes, totalQuestions = 15, source = 'hybrid' } = req.body;

    if (!level) return res.status(400).json({ error: 'El nivel es obligatorio' });
    if (!exerciseTypes || !exerciseTypes.length) {
      return res.status(400).json({ error: 'Selecciona al menos un tipo de ejercicio' });
    }

    const exam = await generateExam({
      level,
      topic,
      exerciseTypes,
      totalQuestions: Math.min(parseInt(totalQuestions), 40),
      source,
      orgId: req.user.organization_id,
    });

    await logUsage(req.user.id, req.user.organization_id, 'cambridge', 'exam_generate', exam.aiCount * 200);

    res.json(exam);
  } catch (err) {
    console.error('exam generate error:', err);
    res.status(500).json({ error: 'Error al generar el examen' });
  }
});

// ── POST /cambridge/exams/save ───────────────────────────────
router.post('/exams/save', authenticate, requireModule('cambridge'), async (req, res) => {
  try {
    const { exam, title } = req.body;
    const id = await saveExam({ exam, title, teacherId: req.user.id, orgId: req.user.organization_id });
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar el examen' });
  }
});

// ── GET /cambridge/exams ─────────────────────────────────────
router.get('/exams', authenticate, requireModule('cambridge'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT e.id, e.title, e.level, e.topic, e.created_at,
              u.name as teacher_name,
              jsonb_array_length(e.questions) as question_count
       FROM exams e
       JOIN users u ON e.teacher_id = u.id
       WHERE e.organization_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.organization_id, limit, offset]
    );

    res.json({ exams: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener exámenes' });
  }
});

// ── POST /cambridge/ocr/correct ──────────────────────────────
router.post('/ocr/correct', authenticate, requireModule('cambridge'), upload.single('examImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Imagen requerida' });

    const { certification = 'PET', level = 'B1', feedbackMode = 'full' } = req.body;

    const result = await processExamImage({
      imageBuffer: req.file.buffer,
      certification,
      level,
      feedbackMode,
    });

    await logUsage(req.user.id, req.user.organization_id, 'cambridge', 'ocr_correct', 800);

    res.json(result);
  } catch (err) {
    console.error('ocr correct error:', err);
    res.status(500).json({ error: err.message || 'Error al procesar el examen' });
  }
});

// ── POST /cambridge/dynamics/generate ───────────────────────
router.post('/dynamics/generate', authenticate, requireModule('cambridge'), async (req, res) => {
  try {
    const { level, topic, duration = 15, types = ['speaking'], resources = [], count = 3 } = req.body;

    if (!level) return res.status(400).json({ error: 'El nivel es obligatorio' });

    const dynamics = await generateDynamics({ level, topic, duration, types, resources, count });

    await logUsage(req.user.id, req.user.organization_id, 'cambridge', 'dynamics_generate', 400);

    res.json({ dynamics });
  } catch (err) {
    console.error('dynamics error:', err);
    res.status(500).json({ error: 'Error al generar dinámicas' });
  }
});

// ── POST /cambridge/presentations/generate ──────────────────
router.post('/presentations/generate', authenticate, requireModule('cambridge'), async (req, res) => {
  try {
    const { sourceText, level, unit, outputTypes = ['slides', 'notebooklm'] } = req.body;

    if (!sourceText || sourceText.trim().length < 50) {
      return res.status(400).json({ error: 'El texto fuente debe tener al menos 50 caracteres' });
    }

    const result = await generatePresentation({ sourceText, level, unit, subject: 'cambridge', outputTypes });

    await logUsage(req.user.id, req.user.organization_id, 'cambridge', 'presentation_generate', 600);

    res.json(result);
  } catch (err) {
    console.error('presentations error:', err);
    res.status(500).json({ error: 'Error al generar la presentación' });
  }
});

module.exports = router;
