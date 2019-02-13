'use strict';

const Boom = require('boom');
const List = require('../models/List');

/**
 * @module ListPolicy
 * @description List Policy
 */
module.exports = {

  canCreate: function (request, reply) {
    if (request.payload.type !== 'list') {
      throw Boom.badRequest('You are not allowed to create lists of a type other than custom contact list');
    }
    return true;
  },

  canUpdate: async function (request, reply) {
    const list = await List
      .findOne({_id: request.params.id})
      .populate('owner managers');

    if (request.payload.type && request.payload.type !== list.type) {
      throw Boom.unauthorized('You are not allowed to modify the list type');
    }

    if (request.auth.credentials.is_admin ||
      request.auth.credentials.isManager ||
      list.isOwner(request.auth.credentials)) {
      return true;
    }
    else {
      throw Boom.unauthorized('You are not allowed to update this list');
    }
  },

  canDestroy: async function (request, reply) {
    if (request.auth.credentials.is_admin || request.auth.credentials.isManager) {
      return true;
    }
    const list = await List
      .findOne({_id: request.params.id})
      .populate('owner managers');

    if (list.isOwner(request.auth.credentials)) {
      return true;
    }
    else {
      throw Boom.unauthorized('You are not allowed to delete this list');
    }

  }
};
