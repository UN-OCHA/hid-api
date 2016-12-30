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
      },
      methods: {
        toJSON: function () {
          const creds = this.toObject();
          delete creds.googlegroup.secrets;
          delete creds.googlegroup.token;
          return creds;
        }
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
