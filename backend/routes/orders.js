const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  completePayment
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, createOrder)
  .get(protect, getOrders);

router.route('/:id')
  .get(protect, getOrder);

router.route('/:id/status')
  .put(protect, authorize('admin'), updateOrderStatus);

router.route('/:id/payment')
  .put(protect, completePayment);

module.exports = router;
