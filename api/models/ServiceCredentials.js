'use strict';

const Model = require('trails-model');
const Schema = require('mongoose').Schema;

/**
 * @module ServiceCredentials
 * @description Service Credentials
 */
module.exports = class ServiceCredentials extends Model {

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
        enum: ['googlegroup'],
        required: [true, 'Type is required']
      },
      googlegroup: {
        domain: {
          type: String
        },
        secrets: Schema.Types.Mixed,
        token: Schema.Types.Mixed
      }
    };
  }
};
