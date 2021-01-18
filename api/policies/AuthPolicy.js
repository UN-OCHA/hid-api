const Boom = require('@hapi/boom');
const authenticator = require('authenticator');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
* @module AuthPolicy
* @description Is the request authenticated
*/

async function isTOTPValid(user, token) {
  if (!user.totpConf || !user.totpConf.secret) {
    logger.warn(
      `[AuthPolicy->isTOTPValid] TOTP was not configured for user ${user.id}`,
      { security: true },
    );
    throw Boom.unauthorized('TOTP was not configured for this user', 'totp');
  }

  if (!token) {
    logger.warn(
      '[AuthPolicy->isTOTPValid] No TOTP token',
      { security: true },
    );
    throw Boom.unauthorized('No TOTP token', 'totp');
  }

  if (token.length === 6) {
    const success = authenticator.verifyToken(user.totpConf.secret, token);

    if (success) {
      return user;
    }
    logger.warn(
      `[AuthPolicy->isTOTPValid] Invalid TOTP token ${token}`,
      { security: true },
    );
    throw Boom.unauthorized('Invalid TOTP token !', 'totp');
  }

  // Using backup code
  const index = user.backupCodeIndex(token);
  if (index === -1) {
    logger.warn(
      `[AuthPolicy->isTOTPValid] Invalid backup code ${token}`,
      { security: true },
    );
    throw Boom.unauthorized('Invalid backup code !', 'totp');
  }

  // remove backup code so it can't be reused
  user.totpConf.backupCodes.slice(index, 1);
  user.markModified('totpConf');
  await user.save();
  logger.info(
    `[AuthPolicy->isTOTPValid] Successfully removed backup code for user ${user.id}`,
  );
  return user;
}

module.exports = {

  isTOTPValid,

  /**
   * Enforces an _optional_ TOTP requirement. If the user has 2FA enabled, they
   * must answer this challenge. Users without 2FA enabled will pass through.
   */
  async isTOTPEnabledAndValid(request, internalArgs) {
    let user, totp;

    if (internalArgs && internalArgs.user && internalArgs.totp) {
      user = internalArgs.user;
      totp = internalArgs.totp;
    } else {
      user = request.auth.credentials;
      totp = request.headers['x-hid-totp'];
    }

    // User does not have totp enabled, so return true.
    if (!user.totp) {
      return true;
    }

    // Validate the TOTP code.
    await isTOTPValid(user, totp);

    // If no error was thrown, return true.
    return true;
  },

  async isTOTPValidPolicy(request) {
    const user = request.auth.credentials;
    const token = request.headers['x-hid-totp'];
    await isTOTPValid(user, token);
    return true;
  },

  isAdmin(request) {
    // First, check if credentials were sent at all. If not, we can instruct the
    // user to authenticate before trying again by sending 401.
    if (!request.auth.credentials) {
      throw Boom.unauthorized();
    }

    // User authenticated correctly, and has admin permissions.
    if (request.auth.credentials.is_admin) {
      return true;
    }

    // If credentials were sent, but the user isn't an admin, send 403.
    logger.warn(
      `[AuthPolicy->isAdmin] User ${request.auth.credentials.id} is not an admin`,
      { security: true, fail: true, request },
    );
    throw Boom.forbidden('You need to be an admin');
  },

  isAdminOrGlobalManager(request) {
    if (!request.auth.credentials.is_admin && !request.auth.credentials.isManager) {
      logger.warn(
        `[AuthPolicy->isAdminOrGlobalManager] User ${request.auth.credentials.id} is neither an admin nor a global manager`,
        { security: true, fail: true, request },
      );
      throw Boom.forbidden('You need to be an admin or a global manager');
    }
    return true;
  },

};
