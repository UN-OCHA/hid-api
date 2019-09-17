const Boom = require('@hapi/boom');
const Service = require('../models/Service');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;
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
    logger.warn(
      `[ServicePolicy->canUpdate] Can not find service ${request.params.id}`,
    );
    throw Boom.notFound();
  }
  if (srv.managersIndex(request.auth.credentials) !== -1
    || srv.owner.id === request.auth.credentials.id) {
    return true;
  }
  logger.warn(
    `[ServicePolicy->canUpdate] User ${request.auth.credentials.id} can not update service ${request.params.id}`,
  );
  throw Boom.forbidden();
}

function canSubscribe(request) {
  if (!request.auth.credentials.is_admin
      && !request.auth.credentials.isManager
      && request.auth.credentials.id !== request.params.id) {
    logger.warn(
      `[ServicePolicy->canSubscribe] User ${request.auth.credentials.id} can not subscribe to service ${request.params.id}`,
    );
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
