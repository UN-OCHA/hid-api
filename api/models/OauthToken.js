'use strict'

const Model = require('trails-model')
const crypto = require('crypto')
const Schema = require('mongoose').Schema

/**
 * @module OauthToken
 * @description OAuth2 Token
 */
module.exports = class OauthToken extends Model {

  static config () {
    return {
      statics: {
        generate: function (callback) {
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
      type: {
        type: String,
        required: true,
        enum: ['code', 'access', 'refresh']
      },
      token: {
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
      expires: {
        type: Date
      }
    }
  }
}

