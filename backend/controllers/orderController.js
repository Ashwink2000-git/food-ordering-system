const Order = require('../models/Order');
const Item = require('../models/Item');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { generateQRCode } = require('../utils/qrGenerator');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { items, paymentMethod } = req.body;
  
  // Validate order items
  if (!items || items.length === 0) {
    return next(new ErrorResponse('Please add items to your order', 400));
  }
  
  // Calculate total and check stock
  let totalAmount = 0;
  let orderItems = [];
  
  for (const orderItem of items) {
    const item = await Item.findById(orderItem.item);
    
    if (!item) {
      return next(new ErrorResponse(`Item not found with id of ${orderItem.item}`, 404));
    }
    
    if (item.stock < orderItem.quantity) {
      return next(new ErrorResponse(`Insufficient stock for ${item.name}`, 400));
    }
    
    totalAmount += item.price * orderItem.quantity;
    orderItems.push({
      item: item._id,
      name: item.name,
      price: item.price,
      quantity: orderItem.quantity
    });
  }
  
  // Create order
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    totalAmount,
    paymentMethod
  });
  
  // Generate QR code for payment if payment method is QR
  let paymentQR = null;
  if (paymentMethod === 'qr') {
    paymentQR = await generateQRCode(order._id, totalAmount);
  }
  
  // Notify admins of new order via socket
  req.io.emit('newOrder', { 
    orderId: order._id, 
    userId: req.user.id,
    userName: req.user.name,
    totalAmount,
    paymentMethod
  });
  
  // If COD, notify admins specifically
  if (paymentMethod === 'cod') {
    req.io.emit('codOrder', { 
      orderId: order._id, 
      userName: req.user.name,
      totalAmount
    });
  }
  
  res.status(201).json({ 
    success: true, 
    data: order,
    paymentQR
  });
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Admin)
exports.getOrders = asyncHandler(async (req, res, next) => {
  let query;
  
  // If user role is admin, get all orders
  if (req.user.role === 'admin') {
    query = Order.find().populate('user', 'name email');
  } else {
    // If user role is user, get only their orders
    query = Order.find({ user: req.user.id });
  }
  
  // Sort by most recent
  query = query.sort('-createdAt');
  
  const orders = await query;
  
  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  
  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }
  
  // Make sure user is order owner or admin
  if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`Not authorized to access this order`, 401));
  }
  
  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const order = await Order.findByIdAndUpdate(
    id,
    { orderStatus: status },
    { new: true, runValidators: true }
  );
  
  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${id}`, 404));
  }
  
  // If order is delivered, update payment status for COD orders
  if (status === 'delivered' && order.paymentMethod === 'cod') {
    order.paymentStatus = 'completed';
    await order.save();
  }
  
  // Emit socket event for real-time updates
  req.io.emit('orderStatusUpdate', { 
    orderId: id, 
    status: order.orderStatus,
    paymentStatus: order.paymentStatus
  });
  
  // Notify user of order status update
  req.io.to(`user:${order.user}`).emit('orderUpdate', {
    orderId: id,
    status: order.orderStatus
  });
  
  res.status(200).json({ success: true, data: order });
});

// @desc    Complete payment (for QR payments)
// @route   PUT /api/orders/:id/payment
// @access  Private
exports.completePayment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  const order = await Order.findById(id);
  
  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${id}`, 404));
  }
  
  // Verify that the order belongs to the user
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to update this order', 401));
  }
  
  // Update payment status
  order.paymentStatus = 'completed';
  await order.save();
  
  // Update stock for each item
  for (const orderItem of order.items) {
    const item = await Item.findById(orderItem.item);
    
    if (item) {
      item.stock = Math.max(0, item.stock - orderItem.quantity);
      item.isAvailable = item.stock > 0;
      await item.save();
      
      // Emit socket event for real-time stock updates
      req.io.emit('stockUpdate', { item: item._id, stock: item.stock });
    }
  }
  
  // Emit socket event for order payment update
  req.io.emit('paymentUpdate', { 
    orderId: id, 
    paymentStatus: 'completed'
  });
  
  res.status(200).json({ success: true, data: order });
});
