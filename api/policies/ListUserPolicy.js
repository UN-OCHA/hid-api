'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');

/**
 * @module ListUserPolicy
 * @description ListUser Policy
 */
module.exports = class ListUserPolicy extends Policy {
  canCheckin (request, reply) {
    const List = this.app.orm.List;
    if (request.params.currentUser.is_admin || request.params.currentUser.isManager) {
      return reply();
    }
    if (request.params.currentUser.hidden === true) {
      return reply(Boom.unauthorized('You are not authorized to check into lists'));
    }
    const that = this;
    List
      .findOne({_id: request.payload.list})
      .then((list) => {
        if (!list) {
          return reply(Boom.badRequest('List not found'));
        }
        if (list.isOwner(request.params.currentUser) || list.joinability !== 'private') {
          return reply();
        }
        else {
          return reply(Boom.unauthorized('You are not authorized to do this'));
        }
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  canCheckout(request, reply) {
    const User = this.app.orm.User;
    const childAttribute = request.params.childAttribute;
    const checkInId = request.params.checkInId;
    if (request.params.currentUser.is_admin || request.params.currentUser.isManager) {
      return reply();
    }
    const populate = childAttribute + '.list';
    const that = this;
    User
      .findOne({_id: request.params.id})
      .populate(populate)
      .then((user) => {
        const lu = user[childAttribute].id(checkInId);
        if (lu.list.isOwner(request.params.currentUser) ||
          request.params.currentUser.id === request.params.id) {
          return reply();
        }
        else {
          return reply(Boom.unauthorized('You are not authorized to do this'));
        }
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  canUpdate (request, reply) {
    const User = this.app.orm.User;
    const childAttribute = request.params.childAttribute;
    const checkInId = request.params.checkInId;

    const populate = childAttribute + '.list';
    const that = this;
    User
      .findOne({_id: request.params.id})
      .populate(populate)
      .then((user) => {
        const lu = user[childAttribute].id(checkInId);
        if (lu.pending === true && request.payload.pending === false) {
          // User is being approved: allow only administrators, list managers and list owners to do this
          if (!lu.list.isOwner(request.params.currentUser)) {
            return reply(Boom.unauthorized('You need to be an admin or a manager of this list'));
          }
        }
        else {
          // Other changes are being made; allow only: admins, global managers, list managers, list owners, current user
          if (!lu.list.isOwner(request.params.currentUser) &&
            !request.params.currentUser.isManager &&
            request.params.currentUser.id !== request.params.id) {
            return reply(Boom.unauthorized('You are not authorized to do this'));
          }
        }
        reply();
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }
};
