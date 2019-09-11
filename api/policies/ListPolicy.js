const Boom = require('boom');
const List = require('../models/List');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module ListPolicy
 * @description List Policy
 */
module.exports = {

  canCreate(request) {
    if (request.payload.type !== 'list') {
      logger.warn(
        `[ListPolicy->canCreate] User ${request.auth.credentials.id} tried to create a list of type ${request.payload.type}`,
      );
      throw Boom.badRequest('You are not allowed to create lists of a type other than custom contact list');
    }
    return true;
  },

  async canUpdate(request) {
    const list = await List
      .findOne({ _id: request.params.id })
      .populate('owner managers');

    if (request.payload.type && request.payload.type !== list.type) {
      logger.warn(
        `[ListPolicy->canUpdate] User ${request.auth.credentials.id} is not allowed to modified the type of the list ${request.params.id}`,
      );
      throw Boom.unauthorized('You are not allowed to modify the list type');
    }

    if (request.auth.credentials.is_admin
      || request.auth.credentials.isManager
      || list.isOwner(request.auth.credentials)) {
      return true;
    }
    logger.warn(
      `[ListPolicy->canUpdate] User ${request.auth.credentials.id} is not allowed to modify list ${request.params.id}`,
    );
    throw Boom.unauthorized('You are not allowed to update this list');
  },

  async canDestroy(request) {
    if (request.auth.credentials.is_admin || request.auth.credentials.isManager) {
      return true;
    }
    const list = await List
      .findOne({ _id: request.params.id })
      .populate('owner managers');

    if (list.isOwner(request.auth.credentials)) {
      return true;
    }
    logger.warn(
      `[ListPolicy->canDestroy] User ${request.auth.credentials.id} is not allowed to delete list ${request.params.id}`,
    );
    throw Boom.unauthorized('You are not allowed to delete this list');
  },
};
