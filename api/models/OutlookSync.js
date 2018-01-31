'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;

/**
 * @module OutlookSync
 * @description Outlook sync
 */
module.exports = class OutlookSync extends Model {

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
        ref: 'List',
        required: [true, 'A list is required']
      },
      folder: {
        type: String,
        required: [true, 'A folder ID is required']
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      }
    };

  }
};
