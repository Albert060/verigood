const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/usersController');

const router = express.Router();

router.get('/organizations/:orgId/users', authenticate, authorize('admin_centro', 'superadmin'), getUsers);
router.post('/organizations/:orgId/users', authenticate, authorize('admin_centro', 'superadmin'), createUser);
router.patch('/users/:userId', authenticate, authorize('admin_centro', 'superadmin'), updateUser);
router.delete('/users/:userId', authenticate, authorize('admin_centro', 'superadmin'), deleteUser);

module.exports = router;
