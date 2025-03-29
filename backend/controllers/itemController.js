const Item = require('../models/Item');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { uploadToS3 } = require('../middleware/upload');

// @desc    Get all items
// @route   GET /api/items
// @access  Public
exports.getItems = asyncHandler(async (req, res, next) => {
  const items = await Item.find();
  res.status(200).json({ success: true, count: items.length, data: items });
});

// @desc    Get a single item
// @route   GET /api/items/:id
// @access  Public
exports.getItem = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({ success: true, data: item });
});

// @desc    Get items by category
// @route   GET /api/items/category/:category
// @access  Public
exports.getItemsByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;
  const items = await Item.find({ category });
  res.status(200).json({ success: true, count: items.length, data: items });
});

// @desc    Create new item
// @route   POST /api/items
// @access  Private (Admin)
exports.createItem = asyncHandler(async (req, res, next) => {
  const { name, description, price, category, subCategory, stock } = req.body;
  
  // Upload image to S3
  if (!req.file) {
    return next(new ErrorResponse('Please upload an image', 400));
  }
  
  const imageUrl = await uploadToS3(req.file);
  
  // Create item
  const item = await Item.create({
    name,
    description,
    price,
    category,
    subCategory,
    stock,
    imageUrl
  });

  // Emit socket event for real-time updates
  req.io.emit('stockUpdate', { item: item._id, stock: item.stock });
  
  res.status(201).json({ success: true, data: item });
});

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private (Admin)
exports.updateItem = asyncHandler(async (req, res, next) => {
  let item = await Item.findById(req.params.id);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }
  
  // Check if image is being updated
  if (req.file) {
    const imageUrl = await uploadToS3(req.file);
    req.body.imageUrl = imageUrl;
  }
  
  // Update item
  item = await Item.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  // Emit socket event for real-time updates
  req.io.emit('itemUpdate', { item: item._id, data: item });
  
  res.status(200).json({ success: true, data: item });
});

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private (Admin)
exports.deleteItem = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id);
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${req.params.id}`, 404));
  }
  
  await item.remove();
  
  // Emit socket event for real-time updates
  req.io.emit('itemDelete', { item: req.params.id });
  
  res.status(200).json({ success: true, data: {} });
});

// @desc    Update item stock
// @route   PUT /api/items/:id/stock
// @access  Private (Admin)
exports.updateItemStock = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { stock } = req.body;
  
  const item = await Item.findByIdAndUpdate(
    id,
    { stock, isAvailable: stock > 0 },
    { new: true, runValidators: true }
  );
  
  if (!item) {
    return next(new ErrorResponse(`Item not found with id of ${id}`, 404));
  }
  
  // Emit socket event for real-time updates
  req.io.emit('stockUpdate', { item: id, stock: item.stock });
  
  res.status(200).json({ success: true, data: item });
});
