const express = require('express');
const { authenticate, requireModuleActive } = require('../middleware/auth');
const { listForModule, run } = require('../controllers/moduleToolsController');

const router = express.Router();

// Listar herramientas de un módulo.
// Requiere sólo autenticación: queremos que el catálogo de tools sea consultable
// aunque la org no tenga el módulo activo (por ejemplo, para que el panel admin
// pueda enseñar qué va a obtener al activarlo).
router.get('/modules/:moduleId/tools', authenticate, listForModule);

// Ejecutar una herramienta. Requiere autenticación + módulo activo en la org.
router.post(
  '/modules/:moduleId/tools/:toolKey/run',
  authenticate,
  requireModuleActive,
  run
);

module.exports = router;
