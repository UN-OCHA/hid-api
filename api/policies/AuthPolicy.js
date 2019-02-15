'use strict';

const Boom = require('boom');
const authenticator = require('authenticator');
const config = require('../../config/env')[process.env.NODE_ENV];
const logger = config.logger;

/**
* @module AuthPolicy
* @description Is the request authenticated
*/

const isTOTPValid = function isTOTPValid (user, token) {
  return new Promise(function (resolve, reject) {
    if (!user.totpConf || !user.totpConf.secret) {
      return reject(Boom.unauthorized('TOTP was not configured for this user', 'totp'));
    }

    if (!token) {
      return reject(Boom.unauthorized('No TOTP token', 'totp'));
    }

    if (token.length === 6) {
      const success = authenticator.verifyToken(user.totpConf.secret, token);

      if (success) {
        return resolve(user);
      }
      else {
        return reject(Boom.unauthorized('Invalid TOTP token !', 'totp'));
      }
    }
    else {
      // Using backup code
      const index = user.backupCodeIndex(token);
      if (index === -1) {
        return reject(Boom.unauthorized('Invalid backup code !', 'totp'));
      }
      else {
        // remove backup code so it can't be reused
        user.totpConf.backupCodes.slice(index, 1);
        user.markModified('totpConf');
        user
        .save()
        .then(() => {
          return resolve(user);
        })
        .catch(err => {
          return reject(Boom.badImplementation());
        });
      }
    }
  });
};

module.exports = {

  isTOTPValid: isTOTPValid,

  isTOTPEnabledAndValid: async function (request, reply) {
    const user = request.auth.credentials;

    if (!user.totp) {
      // User does not have totp enabled, pass
      return true;
    }
    else {
      await isTOTPValid(user, request.headers['x-hid-totp']);
      return true;
    }
  },

  isTOTPValidPolicy: async function (request, reply) {
    const user = request.auth.credentials;
    const token = request.headers['x-hid-totp'];
    await isTOTPValid(user, token);
    return true;
  },

  isAdmin: function (request, reply) {
    if (!request.auth.credentials.is_admin) {
      logger.warn('User is not an admin', { security: true, fail: true, request: request});
      throw Boom.forbidden('You need to be an admin');
    }
    return true;
  },

  isAdminOrGlobalManager: function (request, reply) {
    if (!request.auth.credentials.is_admin && !request.auth.credentials.isManager) {
      logger.warn('User is neither an admin nor a global manager', { security: true, fail: true, request: request});
      throw Boom.forbidden('You need to be an admin or a global manager');
    }
    return true;
  }

};
