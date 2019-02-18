

const Boom = require('boom');
const List = require('../models/List');
const User = require('../models/User');

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
      throw Boom.unauthorized('You are not authorized to check into lists');
    }
    const list = await List.findOne({ _id: request.payload.list });
    if (!list) {
      throw Boom.badRequest('List not found');
    }
    if (list.isOwner(request.auth.credentials) || list.joinability !== 'private') {
      return true;
    }
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
        throw Boom.unauthorized('You need to be an admin or a manager of this list');
      }
    } else if (!lu.list.isOwner(request.auth.credentials)
      && !request.auth.credentials.isManager
      && request.auth.credentials.id !== request.params.id) {
      // Other changes are being made; allow only: admins, global managers,
      // list managers, list owners, current user
      throw Boom.unauthorized('You are not authorized to do this');
    }
    return true;
  },
};
