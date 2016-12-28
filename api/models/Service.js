'use strict';

const Model = require('trails-model');
const Schema = require('mongoose').Schema;

/**
 * @module Service
 * @description Service
 */
module.exports = class Service extends Model {

  static config () {
    return {
      schema: {
        timestamps: true
      }
    };
  }

  static schema () {
    const mailchimpSchema = new Schema({
      apiKey: {
        type: String
      },
      list: {
        id: String,
        name: String
      }
    });

    const googlegroupSchema = new Schema({
      domain: {
        type: String
      },
      group: {
        id: String,
        name: String,
        email: String
      }
    });

    return {
      name: {
        type: String
      },
      description: {
        type: String
      },
      owner: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      type: {
        type: String,
        enum: ['mailchimp', 'googlegroup'],
        required: [true, 'Service type is required']
      },
      deleted: {
        type: Boolean,
        default: false
      },
      hidden: {
        type: Boolean,
        default: false
      },
      autoAdd: {
        type: Boolean,
        default: false
      },
      autoRemove: {
        type: Boolean,
        default: false
      },
      mailchimp: mailchimpSchema,
      googlegroup: googlegroupSchema

    };
  }
};
