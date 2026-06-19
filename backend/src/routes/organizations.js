const express = require('express');
const { authenticate, authorize, authenticateSuperadmin } = require('../middleware/auth');
const {
  getOrg, updateOrg, getStats, updateModules,
  getAllOrgs, superadminUpdateOrg, getSuperadminStats,
} = require('../controllers/organizationsController');

const router = express.Router();

// Org-level routes
router.get('/organizations/:orgId', authenticate, getOrg);
router.patch('/organizations/:orgId', authenticate, authorize('admin_centro', 'superadmin'), updateOrg);
// Stats accesibles también para profesores: la pantalla del dashboard (incluido
// "Actividad reciente") las consume. El controller ya valida que orgId del
// URL coincide con el organization_id del JWT, así que no hay fuga entre
// centros — un profesor solo puede ver sus propios stats.
router.get('/organizations/:orgId/stats', authenticate, authorize('admin_centro', 'profesor', 'superadmin'), getStats);
router.patch('/organizations/:orgId/modules', authenticate, authorize('admin_centro', 'superadmin'), updateModules);

// Superadmin routes
router.get('/superadmin/organizations', authenticateSuperadmin, getAllOrgs);
router.patch('/superadmin/organizations/:orgId', authenticateSuperadmin, superadminUpdateOrg);
router.get('/superadmin/stats', authenticateSuperadmin, getSuperadminStats);

module.exports = router;
