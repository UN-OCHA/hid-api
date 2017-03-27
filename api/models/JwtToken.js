'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;

/**
 * @module JwtToken
 * @description Json Web Token
 */
module.exports = class JwtToken extends Model {

  static config () {
  }

  static schema () {
    return {
      token: {
        type: String,
        required: true,
        unique: true
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      expires: {
        type: Date
      }
    };

  }
};
