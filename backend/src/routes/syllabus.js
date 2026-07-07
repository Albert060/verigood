const express = require('express');
const { authenticate, authorize, requireModuleActive } = require('../middleware/auth');
const {
  getSyllabus,
  createSection, updateSection, reorderSections, deleteSection,
  createItem, getItem, listItemCorrections, updateItem, deleteItem,
} = require('../controllers/syllabusController');

const router = express.Router();

// Lectura y creación de temas: requiere módulo contratado por la org (y
// asignado al profesor). Se apoya en requireModuleActive que ya deja pasar
// al superadmin.
router.get(
  '/modules/:moduleId/syllabus',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  requireModuleActive,
  getSyllabus
);
router.post(
  '/modules/:moduleId/syllabus/sections',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  requireModuleActive,
  createSection
);
// T4 · Reorden atómico de temas del temario en una transacción.
router.patch(
  '/modules/:moduleId/syllabus/reorder',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  requireModuleActive,
  reorderSections
);

// Mutaciones sobre section/item: la autorización de scope (misma org) la hace
// el controller vía join a syllabi.organization_id. Aquí sólo pedimos que el
// usuario esté autenticado y tenga rol que pueda editar el temario.
router.patch(
  '/syllabus/sections/:sectionId',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  updateSection
);
router.delete(
  '/syllabus/sections/:sectionId',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  deleteSection
);

router.post(
  '/syllabus/sections/:sectionId/items',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  createItem
);
router.get(
  '/syllabus/items/:itemId',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  getItem
);
router.get(
  '/syllabus/items/:itemId/corrections',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  listItemCorrections
);
router.patch(
  '/syllabus/items/:itemId',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  updateItem
);
router.delete(
  '/syllabus/items/:itemId',
  authenticate,
  authorize('admin_centro', 'profesor', 'superadmin'),
  deleteItem
);

module.exports = router;
