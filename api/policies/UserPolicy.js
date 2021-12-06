/**
* @module UserPolicy
* @description User Policy
*/
const Boom = require('@hapi/boom');
const config = require('../../config/env');

const { logger } = config;

module.exports = {
  /**
   * Policy: canUpdate
   *
   * Any user can update themselves. Admins can update any user.
   */
  async canUpdate(request) {
    // If the acting user is an admin
    //   OR any user is targeting themselves
    // THEN they are allowed to update the target user.
    if (request.auth.credentials.is_admin || request.auth.credentials.id === request.params.id) {
      return true;
    }

    // Log that this user had insufficient permissions.
    logger.warn(
      `[UserPolicy->canUpdate] User ${request.auth.credentials.id} can not update user ${request.params.id}`,
      {
        request,
        security: true,
        fail: true,
        user: {
          id: request.auth.credentials.id,
          email: request.auth.credentials.email,
        },
      },
    );
    throw Boom.forbidden();
  },

  /**
   * Policy: canFind
   *
   * Any user can find themselves. Admins can find any user.
   */
  async canFind(request) {
    // If the acting user is an admin
    //   OR any user is targeting themselves
    // THEN they are allowed to view the target user.
    if (request.auth.credentials.is_admin || request.auth.credentials.id === request.params.id) {
      return true;
    }

    // Log that this user had insufficient permissions.
    logger.warn(
      `[UserPolicy->canFind] User ${request.auth.credentials.id} can not view other users`,
      {
        request,
        security: true,
        fail: true,
        user: {
          id: request.auth.credentials.id,
          email: request.auth.credentials.email,
        },
      },
    );
    throw Boom.forbidden();
  },
};
