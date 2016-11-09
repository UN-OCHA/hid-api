'use strict'

const Model = require('trails-model')
const Schema = require('mongoose').Schema

/**
 * @module OauthAccessToken
 * @description OAuth2 Access Token
 */
module.exports = class OauthAccessToken extends Model {

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
