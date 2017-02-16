'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;

/**
 * @module Duplicate
 * @description User duplicate
 */
module.exports = class Duplicate extends Model {

  static config () {
  }

  static schema () {
    return {
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      duplicates: [{
        type: Schema.ObjectId,
        ref: 'User'
      }]
    };
  }
};
