const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createItem, listItems, getItem, updateItem, deleteItem } = require('../controllers/libraryController');

const router = express.Router();

router.post('/library/items',       authenticate, createItem);
router.get('/library/items',        authenticate, listItems);
router.get('/library/items/:id',    authenticate, getItem);
router.patch('/library/items/:id',  authenticate, updateItem);
router.delete('/library/items/:id', authenticate, deleteItem);

module.exports = router;
