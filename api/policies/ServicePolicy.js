'use strict';

const Boom = require('boom');
const Service = require('../models/Service');
const ErrorService = require('../services/ErrorService');

/**
 * @module ServicePolicy
 * @description Service Policy
 */

async function _canUpdate(request, reply) {
  if (request.auth.credentials.is_admin) {
    return true;
  }
  const srv = await Service.findOne({_id: request.params.id}).populate('lists owner managers');
  if (!srv) {
    throw Boom.notFound();
  }
  if (srv.managersIndex(request.auth.credentials) !== -1 ||
    srv.owner.id === request.auth.credentials.id) {
    return true;
  }
  else {
    throw Boom.forbidden();
  }
}

function _canSubscribe (request, reply) {
  if (!request.auth.credentials.is_admin &&
      !request.auth.credentials.isManager &&
      request.auth.credentials.id !== request.params.id) {
    throw Boom.unauthorized('You need to be an admin or a manager or the current user');
  }
  return true;
}

module.exports = {
  canUpdate: _canUpdate,

  canDestroy: _canUpdate,

  canSubscribe: _canSubscribe,

  canUnsubscribe: _canSubscribe
};
