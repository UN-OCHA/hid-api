

const Boom = require('boom');
const Service = require('../models/Service');

/**
 * @module ServicePolicy
 * @description Service Policy
 */

async function canUpdate(request) {
  if (request.auth.credentials.is_admin) {
    return true;
  }
  const srv = await Service.findOne({ _id: request.params.id }).populate('lists owner managers');
  if (!srv) {
    throw Boom.notFound();
  }
  if (srv.managersIndex(request.auth.credentials) !== -1
    || srv.owner.id === request.auth.credentials.id) {
    return true;
  }

  throw Boom.forbidden();
}

function canSubscribe(request) {
  if (!request.auth.credentials.is_admin
      && !request.auth.credentials.isManager
      && request.auth.credentials.id !== request.params.id) {
    throw Boom.unauthorized('You need to be an admin or a manager or the current user');
  }
  return true;
}

module.exports = {
  canUpdate,

  canDestroy: canUpdate,

  canSubscribe,

  canUnsubscribe: canSubscribe,
};
