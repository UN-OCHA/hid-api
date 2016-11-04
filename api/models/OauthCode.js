'use strict'

const Model = require('trails-model')
const crypto = require('crypto')
const Schema = require('mongoose').Schema

/**
 * @module OauthCode
 * @description OAuth2 Code
 */
module.exports = class OauthCode extends Model {

  static config () {
    return {
      statics: {
        generateCode: function (callback) {
          crypto.randomBytes(256, function (ex, buffer) {
            if (ex) return callback(error('server_error'));

            var token = crypto
              .createHash('sha1')
              .update(buffer)
              .digest('hex');

            callback(false, token);
          });
        }
      }
    }
  }

  static schema () {
    return {
      code: {
        type: String,
        required: true,
        unique: true
      },
      client: {
        type: Schema.ObjectId,
        ref: 'Client'
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      nonce: {
        type: String
      },
      expires: {
        type: Date
      }
    }
  }
}
