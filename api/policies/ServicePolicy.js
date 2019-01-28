'use strict';

const Boom = require('boom');
const Service = require('../models/Service');
const ErrorService = require('../services/ErrorService');

/**
 * @module ServicePolicy
 * @description Service Policy
 */

function _canUpdate(request, reply) {
  if (request.params.currentUser.is_admin) {
    return reply();
  }
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
      ErrorService.handle(err, request, reply);
    });
}

function _canSubscribe (request, reply) {
  if (!request.params.currentUser.is_admin &&
      !request.params.currentUser.isManager &&
      request.params.currentUser.id !== request.params.id) {
    return reply(Boom.unauthorized('You need to be an admin or a manager or the current user'));
  }
  reply();
}

module.exports = {
  canUpdate: _canUpdate,

  canDestroy: _canUpdate,

  canSubscribe: _canSubscribe,

  canUnsubscribe: _canSubscribe
};
