const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide item name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide item description']
  },
  price: {
    type: Number,
    required: [true, 'Please provide item price']
  },
  category: {
    type: String,
    required: [true, 'Please specify category'],
    enum: ['food', 'snack', 'drink']
  },
  subCategory: {
    type: String,
    required: [true, 'Please specify subcategory']
  },
  stock: {
    type: Number,
    required: [true, 'Please specify stock quantity'],
    min: 0
  },
  imageUrl: {
    type: String,
    required: [true, 'Please provide an image URL']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Item', ItemSchema);

// models/Order.js
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  name: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [OrderItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['qr', 'cod']
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    required: true,
    enum: ['placed', 'processing', 'delivered'],
    default: 'placed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);
