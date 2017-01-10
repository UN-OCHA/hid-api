'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');

/**
 * @module ServicePolicy
 * @description Service Policy
 */
module.exports = class ServicePolicy extends Policy {
  canUpdate (request, reply) {
    if (request.params.currentUser.is_admin) {
      return reply();
    }
    var that = this;
    this.app.orm.Service
      .findOne({_id: request.params.id})
      .then((srv) => {
        if (!srv) {
          throw Boom.notFound();
        }
        if (srv.managersIndex(request.params.currentUser) !== -1) {
          return reply();
        }
        else {
          throw Boom.forbidden();
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  canDestroy (request, reply) {
    this.canUpdate(request, reply);
  }

  canSubscribe (request, reply) {
    if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager && request.params.currentUser.id !== request.params.id) {
      return reply(Boom.unauthorized('You need to be an admin or a manager or the current user'));
    }
    reply();
  }

  canUnsubscribe (request, reply) {
    this.canSubscribe(request, reply);
  }
};
