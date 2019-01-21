'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * @module JwtToken
 * @description Json Web Tokens
 */

const JwtSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  },
  blacklist: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  collection: 'jwttoken'
});

module.exports = mongoose.model('JwtToken', JwtTokenSchema);
