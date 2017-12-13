'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;

/**
 * @module GSSSync
 * @description Google Spreadsheet Sync
 */
module.exports = class GSSSync extends Model {

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
      spreadsheet: {
        type: String,
        required: [true, 'A spreadsheet ID is required']
      },
      credentials: {
        type: Schema.Types.Mixed
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      }
    };
  }
};
