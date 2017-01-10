'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');

/**
 * @module ListUserPolicy
 * @description ListUser Policy
 */
module.exports = class ListUserPolicy extends Policy {
  canCheckin (request, reply) {
    if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager && request.params.currentUser.id !== request.params.id) {
      return reply(Boom.unauthorized('You need to be an admin or a manager or the current user'));
    }
    reply();
  }

  canCheckout(request, reply) {
    this.canCheckin(request, reply);
  }

  canUpdate (request, reply) {
    const ListUser = this.app.orm.ListUser;
    let that = this;
    ListUser
      .findOne({_id: request.params.checkInId})
      .populate('list user')
      .then((lu) => {
        if (lu.pending === true && request.payload.pending === false) {
          // User is being approved: allow only administrators, list managers and list owners to do this
          if (!lu.list.isOwner(request.params.currentUser)) {
            return reply(Boom.unauthorized('You need to be an admin or a manager of this list'));
          }
        }
        else {
          // Other changes are being made; allow only: admins, global managers, list managers, list owners, current user
          if (!lu.list.isOwner(request.params.currentUser) && !request.params.currentUser.isManager && request.params.currentUser.id !== lu.user.id) {
            return reply(Boom.unauthorized('You are not authorized to do this'));
          }
        }
        reply();
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }


};
