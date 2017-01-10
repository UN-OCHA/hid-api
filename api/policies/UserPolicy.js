'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');

/**
 * @module UserPolicy
 * @description User Policy
 */
module.exports = class UserPolicy extends Policy {

  canCreate (request, reply) {
    if (!request.params.currentUser) {
      if (!request.payload.email) {
        return reply(Boom.badRequest('You need to register with an email address'));
      }
    }
    else {
      if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager) {
        return reply(Boom.forbidden('Only administrators and managers can create users'));
      }
    }
    reply();
  }

  canUpdate (request, reply) {
    if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager && request.params.currentUser.id !== request.params.id) {
      return reply(Boom.unauthorized('You need to be an admin or a manager or the current user'));
    }
    reply();
  }

  canDestroy (request, reply) {
    if (!request.params.currentUser.is_admin && request.params.currentUser.id !== request.params.id) {
      return reply(Boom.unauthorized('You need to be an admin or a manager or the current user'));
    }
    reply();
  }

  canClaim (request, reply) {
    this.canUpdate(request, reply);
  }
};
