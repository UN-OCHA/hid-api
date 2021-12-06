/**
* @module UserPolicy
* @description User Policy
*/
const Boom = require('@hapi/boom');
const config = require('../../config/env');

const { logger } = config;

module.exports = {
  async canDestroy(request) {
    // If the acting user is an admin
    //   OR any user is targeting themselves
    // THEN are allowed to update the target user.
    if (request.auth.credentials.is_admin || request.auth.credentials.id === request.params.id) {
      return true;
    }

    logger.warn(
      `[UserPolicy->canDestroy] User ${request.auth.credentials.id} can not remove user ${request.params.id}`,
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

  async canUpdate(request) {
    // If the acting user is an admin
    //   OR any user is targeting themselves
    // THEN are allowed to update the target user.
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

  async canFind(request) {
    // If the acting user is an admin
    //   OR any user is targeting themselves
    // THEN are allowed to view the target user.
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
