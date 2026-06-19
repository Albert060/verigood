const express = require('express');
const multer = require('multer');
const { authenticate, requireModuleActive } = require('../middleware/auth');
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

// Config pública del OCR para un módulo (siempre accesible si el usuario está
// autenticado: el panel admin puede querer enseñarla al activar el módulo).
router.get('/modules/:moduleId/ocr/config', authenticate, getOcrConfig);

// Ejecutar la corrección OCR. Requiere autenticación + módulo activo.
router.post(
  '/modules/:moduleId/ocr/correct',
  authenticate,
  requireModuleActive,
  upload.single('examImage'),
  correctOcr
);

module.exports = router;
