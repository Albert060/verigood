const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listCatalog,
  listOrgModules,
  activateModule,
  deactivateModule,
  getOnboardingState,
  completeOnboarding,
} = require('../controllers/modulesController');

const router = express.Router();

// Catálogo global (cualquier usuario autenticado puede leerlo)
router.get('/modules', authenticate, listCatalog);

// Módulos activos de una organización
router.get('/organizations/:orgId/modules', authenticate, listOrgModules);

// Toggle de módulos (admin_centro de la propia org o superadmin)
router.post(
  '/organizations/:orgId/modules/:moduleId/activate',
  authenticate,
  authorize('admin_centro', 'superadmin'),
  activateModule
);
router.delete(
  '/organizations/:orgId/modules/:moduleId',
  authenticate,
  authorize('admin_centro', 'superadmin'),
  deactivateModule
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
