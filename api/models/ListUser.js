'use strict'

const Model = require('trails-model')
const Schema = require('mongoose').Schema

/**
 * @module ListUser
 * @description ListUser Model
 */
module.exports = class ListUser extends Model {

  static config () {
  }

  static schema () {
    return {
      list: {
        type: Schema.ObjectId,
        ref: 'List',
        required: [true, 'List is required']
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
      },
      checkoutDate: {
        type: Date
      },
      pending: {
        type: Boolean,
        default: true
      }
    }
  }

}
