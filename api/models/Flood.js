'use strict';

const Model = require('trails-model');
const Schema = require('mongoose').Schema;

/**
 * @module Flood
 * @description Flood attempts
 */
module.exports = class Flood extends Model {

  static config () {
    return {
      schema: {
        timestamps: true
      }
    };
  }

  static schema () {
    return {
      type: {
        type: String,
        enum: ['login'],
        required: [true, 'Flood type is required']
      },
      email: {
        type: String
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      }
    };
  }
};
