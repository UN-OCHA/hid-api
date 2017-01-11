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
    /*if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager && request.params.currentUser.id !== request.params.id) {
      return reply(Boom.unauthorized('You need to be an admin or a manager or the current user'));
    }
    // TODO: if current user make sure he/she can check in this list
    reply();*/
  }

  canDestroy (request, reply) {

  }
};
