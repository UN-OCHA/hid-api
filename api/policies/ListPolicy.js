'use strict';

const Boom = require('boom');
const List = require('../models/List');
const ErrorService = require('../services/ErrorService');

/**
 * @module ListPolicy
 * @description List Policy
 */
module.exports = {

  canCreate: function (request, reply) {
    if (request.payload.type !== 'list') {
      return reply(
        Boom.badRequest('You are not allowed to create lists ' +
        'of a type other than custom contact list')
      );
    }
    reply();
  },

  canUpdate: function (request, reply) {
    List
      .findOne({_id: request.params.id})
      .populate('owner managers')
      .then((list) => {
        if (request.payload.type && request.payload.type !== list.type) {
          return reply(Boom.unauthorized('You are not allowed to modify the list type'));
        }

        if (request.params.currentUser.is_admin ||
          request.params.currentUser.isManager ||
          list.isOwner(request.params.currentUser)) {
          return reply();
        }
        else {
          return reply(Boom.unauthorized('You are not allowed to update this list'));
        }

      })
      .catch((err) => {
        ErrorService.handle(err, request, reply);
      });
  },

  canDestroy: function (request, reply) {
    if (request.params.currentUser.is_admin || request.params.currentUser.isManager) {
      return reply();
    }
    List
      .findOne({_id: request.params.id})
      .populate('owner managers')
      .then((list) => {
        if (list.isOwner(request.params.currentUser)) {
          return reply();
        }
        else {
          return reply(Boom.unauthorized('You are not allowed to delete this list'));
        }

      })
      .catch((err) => {
        ErrorService.handle(err, request, reply);
      });

  }
};
