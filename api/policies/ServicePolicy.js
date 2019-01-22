'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');
const Service = require('../models/Service');

/**
 * @module ServicePolicy
 * @description Service Policy
 */
module.exports = class ServicePolicy extends Policy {
  canUpdate (request, reply) {
    if (request.params.currentUser.is_admin) {
      return reply();
    }
    const that = this;
    Service
      .findOne({_id: request.params.id})
      .populate('lists owner managers')
      .then((srv) => {
        if (!srv) {
          throw Boom.notFound();
        }
        if (srv.managersIndex(request.params.currentUser) !== -1 ||
          srv.owner.id === request.params.currentUser.id) {
          return reply();
        }
        else {
          throw Boom.forbidden();
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  canDestroy (request, reply) {
    this.canUpdate(request, reply);
  }

  canSubscribe (request, reply) {
    if (!request.params.currentUser.is_admin &&
        !request.params.currentUser.isManager &&
        request.params.currentUser.id !== request.params.id) {
      return reply(Boom.unauthorized('You need to be an admin or a manager or the current user'));
    }
    reply();
  }

  canUnsubscribe (request, reply) {
    this.canSubscribe(request, reply);
  }
};
