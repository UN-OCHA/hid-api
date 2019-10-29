const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * @module JwtToken
 * @description Json Web Tokens
 */

const JwtTokenSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  blacklist: {
    type: Boolean,
    default: false,
    required: true,
  },
}, {
  collection: 'jwttoken',
});

JwtTokenSchema.index({
  user: 1,
});

module.exports = mongoose.model('JwtToken', JwtTokenSchema);
