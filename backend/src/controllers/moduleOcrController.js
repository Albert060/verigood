const { query } = require('../config/database');
const { getPublicConfig, isEnabled } = require('../services/ocrSubjects');
const { processSubjectExam } = require('../services/ocrSubjectCorrectorService');
const { runWithApiKey } = require('../services/claudeService');
const { resolveOrgApiKey } = require('../utils/orgApiKey');
const { notify, TYPES: NOTIF_TYPES } = require('../services/notifyService');

// GET /api/modules/:moduleId/ocr/config
// Devuelve la config pública del corrector OCR para que el frontend pinte el
// formulario. Si el módulo no tiene OCR habilitado, devuelve { enabled: false }.
const getOcrConfig = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const config = getPublicConfig(moduleId);
    if (!config) {
      return res.json({ moduleId, enabled: false });
    }
    res.json({ moduleId, ...config });
  } catch (err) {
    console.error('getOcrConfig error:', err);
    res.status(500).json({ error: 'Error al obtener config OCR' });
  }
};

// POST /api/modules/:moduleId/ocr/correct
// Multipart: examImage (file).
// Body: { course, focus, feedbackMode }.
const correctOcr = async (req, res) => {
  try {
    const { moduleId } = req.params;

    if (!isEnabled(moduleId)) {
      return res.status(404).json({ error: 'OCR no disponible para este módulo', code: 'OCR_NOT_ENABLED' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Imagen requerida' });
    }

    const {
      course, focus, feedbackMode = 'full',
      syllabusItemId = null, studentName = null, referenceAnswerKey = null,
    } = req.body || {};

    const orgApiKey = await resolveOrgApiKey(req.user.organization_id);
    const result = await runWithApiKey(orgApiKey, () => processSubjectExam({
      imageBuffer: req.file.buffer,
      moduleId,
      course,
      focus,
      feedbackMode,
      referenceAnswerKey,
    }));

    // Log de consumo (best-effort).
    try {
      await query(
        `INSERT INTO usage_logs (user_id, organization_id, module, action_type, tool_key, tokens_used, metadata)
         VALUES ($1, $2, $3::module_type, $4, $5, $6, $7::jsonb)`,
        [
          req.user.id,
          req.user.organization_id,
          // Igual que en moduleToolsController: el ENUM legacy module_type solo
          // admite valores antiguos; marcamos 'cambridge' como placeholder y
          // guardamos el moduleId real en metadata. Se limpia con migración 004.
          'cambridge',
          'ocr_correct',
          `ocr:${moduleId}`,
          800,
          JSON.stringify({ moduleId, course, focus, feedbackMode, visionUsed: result.visionUsed }),
        ]
      );
    } catch (logErr) {
      console.warn('usage_logs insert failed (non-fatal):', logErr.message);
    }

    // Persistir la corrección en biblioteca. Metadata sirve como pivote:
    //   - syllabusItemId → agrupa correcciones del mismo ejercicio (B6).
    //   - studentName    → nombre del alumno para la lista (B7).
    // El id devuelto se usa en el frontend para el botón "Ver documento".
    let libraryItemId = null;
    try {
      const titleParts = [
        result.subjectLabel || 'Corrección',
        studentName ? `· ${studentName}` : null,
        result.course ? `· ${result.course}` : null,
      ].filter(Boolean);
      const { rows: [saved] } = await query(
        `INSERT INTO library_items
           (organization_id, teacher_id, module_id, tool_key, kind, title, payload, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          req.user.organization_id,
          req.user.id,
          moduleId,
          `ocr:${moduleId}`,
          'ocr',
          titleParts.join(' ').slice(0, 255),
          JSON.stringify(result),
          JSON.stringify({
            moduleId, course, focus, feedbackMode,
            syllabusItemId: syllabusItemId || null,
            studentName:    studentName    || null,
          }),
        ]
      );
      libraryItemId = saved.id;
    } catch (libErr) {
      console.warn('OCR library persist failed (non-fatal):', libErr.message);
    }

    // Notificar al profesor de que la corrección está lista.
    await notify({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      type: NOTIF_TYPES.OCR_COMPLETED,
      title: `Corrección lista: ${studentName || result.subjectLabel || 'examen'}`,
      body: `Puntuación: ${result.totalScore ?? '—'}/${result.maxScore ?? 10} · ${result.grade || ''}`.trim(),
      link: libraryItemId ? `/dashboard/resources/${libraryItemId}` : `/dashboard/resources`,
      metadata: { moduleId, score: result.totalScore, grade: result.grade, syllabusItemId, studentName },
    });

    res.json({ ...result, libraryItemId, syllabusItemId, studentName });
  } catch (err) {
    if (err.code === 'OCR_NOT_ENABLED') {
      return res.status(err.status || 404).json({ error: err.message, code: err.code });
    }
    if (err.code === 'BAD_AI_RESPONSE') {
      console.warn(`BAD_AI_RESPONSE on ocr ${req.params.moduleId}:`, err.preview);
      return res.status(502).json({
        error: 'La IA devolvió un resultado no válido. Vuelve a intentarlo en unos segundos.',
        code: 'BAD_AI_RESPONSE',
      });
    }
    console.error('correctOcr error:', err);
    res.status(500).json({ error: err.message || 'Error al procesar el examen' });
  }
};

module.exports = { getOcrConfig, correctOcr };
