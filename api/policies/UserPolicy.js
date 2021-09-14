/**
* @module UserPolicy
* @description User Policy
*/
const Boom = require('@hapi/boom');
const User = require('../models/User');
const config = require('../../config/env');

const { logger } = config;

module.exports = {
  canCreate(request) {
    if (!request.auth.credentials) {
      if (!request.payload) {
        logger.warn(
          '[UserPolicy->canCreate] No request payload provided for user creation',
          { request: request.payload, fail: true },
        );
        throw Boom.badRequest('Missing request payload');
      } else if (!request.payload.email) {
        // Strip out sensitive fields before logging
        delete request.payload.password;
        delete request.payload.confirm_password;

        logger.warn(
          '[UserPolicy->canCreate] No email address provided for user creation',
          { request: request.payload, fail: true },
        );
        throw Boom.badRequest('You need to register with an email address');
      }
    } else if (!request.auth.credentials.is_admin && !request.auth.credentials.isManager) {
      logger.warn(
        `[UserPolicy->canCreate] User ${request.auth.credentials.id} tried to create another user even though he is not an admin or manager`,
      );
      throw Boom.forbidden('Only administrators and managers can create users');
    }
    return true;
  },

  async canDestroy(request) {
    if (request.auth.credentials.is_admin
      || request.auth.credentials.id === request.params.id) {
      return true;
    }
    const user = await User.findOne({ _id: request.params.id }).populate('createdBy');
    if (user.createdBy
        && user.createdBy.id === request.auth.credentials.id
        && user.email_verified === false
        && request.auth.credentials.isManager) {
      return true;
    }
    logger.warn(
      `[UserPolicy->canDestroy] User ${request.auth.credentials.id} can not remove user ${request.params.id}`,
    );
    throw Boom.unauthorized('You are not allowed to do this operation');
  },

  async canUpdate(request) {
    // If the acting user is an admin
    //   OR any user is targeting themselves
    // THEN are allowed to update the target user.
    if (request.auth.credentials.is_admin || request.auth.credentials.id === request.params.id) {
      const user = await User.findById(request.params.id);
      if (!user) {
        logger.warn(
          `[UserPolicy->canUpdate] User ${request.params.id} not found`,
        );
        throw Boom.notFound();
      }
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

  async canFind(request) {
    if (request.auth.credentials.is_admin) {
      return true;
    }

    // Log that this user had insufficient permissions.
    logger.warn(
      '[UserPolicy->canFind] User lacks permission to search users.',
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
