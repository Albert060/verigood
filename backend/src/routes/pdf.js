const express = require('express');
const { authenticate } = require('../middleware/auth');
const { buildPdf } = require('../services/pdfService');
const { aiAvailable } = require('../utils/aiAvailable');

const router = express.Router();

// POST /api/pdf/render
// Body: { type, data, title, subtitle, moduleKey, filename }
// Returns: application/pdf binary
router.post('/render', authenticate, async (req, res) => {
  try {
    const { type, data, title, subtitle, moduleKey, filename } = req.body || {};
    if (!type || !data) {
      return res.status(400).json({ error: 'type y data son obligatorios' });
    }
    const buf = await buildPdf({ type, data, title, subtitle, moduleKey });
    const safeName = (filename || `${type}-${Date.now()}`).replace(/[^a-z0-9_\-]/gi, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  } catch (err) {
    console.error('pdf render error:', err);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
});

// GET /api/pdf/status — quick check for frontend to show "demo mode" banner
router.get('/status', authenticate, (req, res) => {
  res.json({
    aiAvailable: aiAvailable(),
    demoMode: !aiAvailable(),
  });
});

module.exports = router;
