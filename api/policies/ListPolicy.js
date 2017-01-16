'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');

/**
 * @module ListPolicy
 * @description List Policy
 */
module.exports = class ListPolicy extends Policy {
  canCreate (request, reply) {
    if (request.payload.type !== 'list') {
      return reply(Boom.badRequest('You are not allowed to create lists of a type other than custom contact list'));
    }
    reply();
  }

  canUpdate (request, reply) {
    const List = this.app.orm.List;
    let that = this;
    List
      .findOne({_id: request.params.id})
      .populate('owner managers')
      .then((list) => {
        if (request.payload.type && request.payload.type !== list.type) {
          return reply(Boom.unauthorized('You are not allowed to modify the list type'));
        }

        if (request.params.currentUser.is_admin || request.params.currentUser.isManager || list.isOwner(request.params.currentUser)) {
          return reply();
        }
        else {
          return reply(Boom.unauthorized('You are not allowed to update this list'));
        }

      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  canDestroy (request, reply) {
    if (request.params.currentUser.is_admin || request.params.currentUser.isManager) {
      return reply();
    }
    const List = this.app.orm.List;
    let that = this;
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
        that.app.services.ErrorService.handle(err, reply);
      });

  }
}
