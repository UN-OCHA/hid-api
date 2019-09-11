const Boom = require('boom');
const List = require('../models/List');
const User = require('../models/User');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module ListUserPolicy
 * @description ListUser Policy
 */
module.exports = {
  async canCheckin(request) {
    if (request.auth.credentials.is_admin || request.auth.credentials.isManager) {
      return true;
    }
    if (request.auth.credentials.hidden === true) {
      logger.warn(
        `[ListUserPolicy->canCheckin] User ${request.auth.credentials.id} is flagged and can not check into lists`,
      );
      throw Boom.unauthorized('You are not authorized to check into lists');
    }
    const list = await List.findOne({ _id: request.payload.list });
    if (!list) {
      logger.warn(
        `[ListUserPolicy->canCheckin] List ${request.payload.list} not found`,
      );
      throw Boom.badRequest('List not found');
    }
    if (list.isOwner(request.auth.credentials) || list.joinability !== 'private') {
      return true;
    }
    logger.warn(
      `[ListUserPolicy->canCheckin] User ${request.auth.credentials.id} can not check into list ${request.payload.list}`,
    );
    throw Boom.unauthorized('You are not authorized to do this');
  },

  async canCheckout(request) {
    const { childAttribute } = request.params;
    const { checkInId } = request.params;
    if (request.auth.credentials.is_admin || request.auth.credentials.isManager) {
      return true;
    }
    const populate = `${childAttribute}.list`;
    const user = await User.findOne({ _id: request.params.id }).populate(populate);
    const lu = user[childAttribute].id(checkInId);
    if (lu.list.isOwner(request.auth.credentials)
      || request.auth.credentials.id === request.params.id) {
      return true;
    }
    logger.warn(
      `[ListUserPolicy->canCheckout] User ${request.auth.credentials.id} can not check out of list ${lu.list._id.toString()}`,
    );
    throw Boom.unauthorized('You are not authorized to do this');
  },

  async canUpdate(request) {
    const { childAttribute } = request.params;
    const { checkInId } = request.params;

    const populate = `${childAttribute}.list`;
    const user = await User.findOne({ _id: request.params.id }).populate(populate);
    const lu = user[childAttribute].id(checkInId);
    if (lu.pending === true && request.payload.pending === false) {
      // User is being approved: allow only administrators, list managers and list owners to do this
      if (!lu.list.isOwner(request.auth.credentials)) {
        logger.warn(
          `[ListUserPolicy->canUpdate] User ${request.auth.credentials} needs to be an admin or a manager of list ${lu.list._id.toString()}`,
        );
        throw Boom.unauthorized('You need to be an admin or a manager of this list');
      }
    } else if (!lu.list.isOwner(request.auth.credentials)
      && !request.auth.credentials.isManager
      && request.auth.credentials.id !== request.params.id) {
      // Other changes are being made; allow only: admins, global managers,
      // list managers, list owners, current user
      logger.warn(
        `[ListUserPolicy->canUpdate] User ${request.auth.credentials} can not update checkin for list ${lu.list._id.toString()}`,
      );
      throw Boom.unauthorized('You are not authorized to do this');
    }
    return true;
  },
};
