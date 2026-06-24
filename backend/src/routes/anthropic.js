const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAnthropicStatus,
  setAnthropicKey,
  clearAnthropicKey,
} = require('../controllers/anthropicController');

const router = express.Router();

router.get(
  '/organizations/:orgId/anthropic',
  authenticate,
  authorize('admin_centro', 'superadmin'),
  getAnthropicStatus
);
router.put(
  '/organizations/:orgId/anthropic',
  authenticate,
  authorize('admin_centro', 'superadmin'),
  setAnthropicKey
);
router.delete(
  '/organizations/:orgId/anthropic',
  authenticate,
  authorize('admin_centro', 'superadmin'),
  clearAnthropicKey
);

module.exports = router;
