const express = require('express');
const multer = require('multer');
const { authenticate, requireModuleActive } = require('../middleware/auth');
const { validateUploadMagicBytes } = require('../utils/fileValidation');
const { getOcrConfig, correctOcr } = require('../controllers/moduleOcrController');

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

// Config pública del OCR para un módulo.
// T20 · Añadido `requireModuleActive` — antes cualquier usuario autenticado
// podía leer la config OCR de cualquier módulo del catálogo, aunque su
// centro no lo hubiese contratado. `requireModuleActive` deja pasar al
// superadmin sin restricción y bloquea con 403 al resto si el módulo no
// está activo en `organization_modules` para su org.
router.get(
  '/modules/:moduleId/ocr/config',
  authenticate,
  requireModuleActive,
  getOcrConfig
);

// Ejecutar la corrección OCR. Requiere autenticación + módulo activo.
// T12 · validateUploadMagicBytes tras multer para rechazar archivos con
// mimetype falsificado (el fileFilter solo mira lo que declara el cliente).
router.post(
  '/modules/:moduleId/ocr/correct',
  authenticate,
  requireModuleActive,
  upload.single('examImage'),
  validateUploadMagicBytes,
  correctOcr
);

module.exports = router;
