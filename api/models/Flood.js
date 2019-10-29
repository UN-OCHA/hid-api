const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * @module Flood
 * @description Flood attempts
 */

const FloodSchema = new Schema({
  type: {
    type: String,
    enum: ['login', 'totp'],
    required: [true, 'Flood type is required'],
  },
  email: {
    type: String,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
}, {
  collection: 'flood',
  timestamps: true,
});

FloodSchema.index({
  email: 1,
  type: 1,
  createdAt: 1,
});

module.exports = mongoose.model('Flood', FloodSchema);
