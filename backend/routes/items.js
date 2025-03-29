const express = require('express');
const { 
  getItems,
  getItem,
  getItemsByCategory,
  createItem,
  updateItem,
  deleteItem,
  updateItemStock
} = require('../controllers/itemController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.route('/')
  .get(getItems)
  .post(protect, authorize('admin'), upload, createItem);

router.route('/:id')
  .get(getItem)
  .put(protect, authorize('admin'), upload, updateItem)
  .delete(protect, authorize('admin'), deleteItem);

router.route('/:id/stock')
  .put(protect, authorize('admin'), updateItemStock);

router.get('/category/:category', getItemsByCategory);

module.exports = router;
