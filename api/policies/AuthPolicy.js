/**
* @module AuthPolicy
* @description a collection of functions to enforce authentication and user
* permissions for HID.
*/
const Boom = require('@hapi/boom');
const authenticator = require('authenticator');
const config = require('../../config/env');

const { logger } = config;

/**
 * Enforces a _mandatory_ 2FA code requirement. If the user doesn't have 2FA
 * enabled, then this function will unconditionally return false. User can
 * supply either TOTPs or backup codes.
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
      {
        security: true,
        fail: true,
      },
    );
    throw Boom.unauthorized('Invalid TOTP token !', 'totp');
  }

  // Using backup code
  const index = user.backupCodeIndex(token);
  if (index === -1) {
    logger.warn(
      `[AuthPolicy->isTOTPValid] Invalid backup code ${token}`,
      {
        security: true,
        fail: true,
      },
    );
    throw Boom.unauthorized('Invalid backup code !', 'totp');
  }

  // Remove backup code so it can't be reused.
  user.totpConf.backupCodes.splice(index, 1);
  user.markModified('totpConf.backupCodes');
  await user.save();

  logger.info(
    `[AuthPolicy->isTOTPValid] Successfully removed a backup code for user ${user.id}`,
    {
      security: true,
      user: {
        id: user.id,
        email: user.email,
      },
    },
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
    let user;
    let totp;

    if (internalArgs && internalArgs.user) {
      user = internalArgs.user;
      totp = internalArgs.totp || '';
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

  /**
   * Does the user have an HID account?
   */
  isUser(request) {
    // User authenticated correctly, and has a user ID.
    if (request && request.auth && request.auth.credentials && request.auth.credentials.id) {
      return true;
    }

    // Request lacked the proper Authorization header. If the header was sent
    // with an invalid token, the 401 will get thrown before this function ever
    // executes, and it will return a response saying the token was invalid.
    throw Boom.unauthorized('Send an Authorization header with the Bearer token of the user account you wish to load. For more info see: https://github.com/UN-OCHA/hid_api/wiki/Integrating-with-HID-via-OAuth#step-3--request-user-account-info');
  },

  /**
   * Is the user an admin?
   */
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

  /**
   * When a user is logged into HID Auth, check their permissions for admin.
   *
   * Since this permission is for HID Auth and not the API, we check the cookie
   * instead of looking for request.auth.credentials
   */
  isLoggedInAsAdmin(user) {
    // Must be logged in and marked as admin.
    if (user && user.is_admin) {
      return true;
    }

    throw Boom.forbidden('You do not have sufficient permissions');
  },
};
