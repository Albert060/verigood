const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listCatalog,
  listOrgModules,
  activateModule,
  deactivateModule,
  getOnboardingState,
  completeOnboarding,
  listUserModules,
  assignUserModule,
  unassignUserModule,
} = require('../controllers/modulesController');

const router = express.Router();

// Catálogo global (cualquier usuario autenticado puede leerlo)
router.get('/modules', authenticate, listCatalog);

// Módulos activos de una organización
router.get('/organizations/:orgId/modules', authenticate, listOrgModules);

// Contratación de módulos por organización. EXCLUSIVO del superadmin: el
// admin del centro NO puede activar módulos por su cuenta — solo el
// superadmin distribuye los permisos contratados. El admin del centro
// distribuye después esos módulos a sus profesores via /users/:userId/modules.
router.post(
  '/organizations/:orgId/modules/:moduleId/activate',
  authenticate,
  authorize('superadmin'),
  activateModule
);
router.delete(
  '/organizations/:orgId/modules/:moduleId',
  authenticate,
  authorize('superadmin'),
  deactivateModule
);

// Asignación profesor↔módulo (admin de la propia org o superadmin).
// El propio profesor puede leer sus asignaciones.
router.get('/users/:userId/modules', authenticate, listUserModules);
router.post(
  '/users/:userId/modules/:moduleId',
  authenticate,
  authorize('admin_centro', 'superadmin'),
  assignUserModule
);
router.delete(
  '/users/:userId/modules/:moduleId',
  authenticate,
  authorize('admin_centro', 'superadmin'),
  unassignUserModule
);

// Onboarding state
router.get('/organizations/:orgId/onboarding-state', authenticate, getOnboardingState);
router.post(
  '/organizations/:orgId/onboarding-state/complete',
  authenticate,
  authorize('admin_centro', 'superadmin'),
  completeOnboarding
);

module.exports = router;
