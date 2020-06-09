const Boom = require('@hapi/boom');
const User = require('../models/User');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
* @module UserPolicy
* @description User Policy
*/
async function canUpdate(request) {
  if (!request.auth.credentials.is_admin
    && !request.auth.credentials.isManager
    && request.auth.credentials.id !== request.params.id) {
    logger.warn(
      `[UserPolicy->canUpdate] User ${request.auth.credentials.id} can not update user ${request.params.id}`,
    );
    throw Boom.forbidden('You need to be an admin or a manager or the current user');
  } else {
    if (request.auth.credentials.isManager
      && request.auth.credentials.id !== request.params.id) {
      // If the user is a manager, make sure he is not trying to edit
      // an admin account.
      const user = await User.findById(request.params.id);
      if (!user) {
        logger.warn(
          `[UserPolicy->canUpdate] User ${request.params.id} not found`,
        );
        throw Boom.notFound();
      }
      if (user.is_admin) {
        logger.warn(
          `[UserPolicy->canUpdate] User ${request.params.id} is an admin and can not be edited by another user`,
        );
        throw Boom.forbidden('You are not authorized to edit an admin account');
      }
    }
    return true;
  }
}

module.exports = {

  canCreate(request) {
    if (!request.auth.credentials) {
      if (!request.payload) {
        logger.warn(
          '[UserPolicy->canCreate] No request payload provided for user creation',
          { fail: true, request: request.payload },
        );
        throw Boom.badRequest('Missing request payload');
      } else if (!request.payload.email) {
        logger.warn(
          '[UserPolicy->canCreate] No email address provided for user creation',
          { request: request.payload },
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

  canUpdate,

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

  canClaim: canUpdate,
};
