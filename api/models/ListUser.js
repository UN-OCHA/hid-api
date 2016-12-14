'use strict';

const Model = require('trails-model');
const Schema = require('mongoose').Schema;

/**
 * @module ListUser
 * @description ListUser model
 */
module.exports = class ListUser extends Model {

  static config () {
    return {
      schema: {
        timestamps: true
      }
    };
  }

  static schema () {
    return {
      list: {
        type: Schema.ObjectId,
        ref: 'List'
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      checkoutDate: Date,
      pending: {
        type: Boolean,
        default: true
      },
      remindedCheckout: {
        type: Boolean,
        default: true
      }
    };
  }
};
