'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;

/**
 * @module Operation
 * @description Operation
 */
module.exports = class Operation extends Model {

  static config () {
  }

  static schema () {
    return {
      name: {
        type: String
      },
      remote_id: {
        type: Number,
        readonly: true
      },
      managers: [{
        type: Schema.ObjectId,
        ref: 'User'
      }],
      url: {
        type: String,
        readonly: true
      },
      key_lists: [{
        type: Schema.ObjectId,
        ref: 'List'
      }],
      key_roles: [{
        type: Schema.ObjectId,
        ref: 'List'
      }]
    };

  }
};
