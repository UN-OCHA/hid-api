'use strict';

const Model = require('trails/model');
const crypto = require('crypto');
const Schema = require('mongoose').Schema;

/**
 * @module OauthToken
 * @description OAuth2 Token
 */
module.exports = class OauthToken extends Model {

  static config () {
    return {
      statics: {
        generate: function (type, client, user, callback) {
          crypto.randomBytes(256, function (ex, buffer) {
            if (ex) {
              return callback('server_error');
            }

            const token = crypto
              .createHash('sha1')
              .update(buffer)
              .digest('hex');

            const now = Date.now();
            let sub = user._id;
            if (client.id === 'iasc-prod') {
              sub = user.email;
            }
            const ftoken = {
              type: type,
              token: token,
              client: client._id,
              user: sub,
              expires: now + 7 * 24 * 3600 * 1000
            };

            callback(false, ftoken);
          });
        }
      }
    };
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
    };
  }
};
