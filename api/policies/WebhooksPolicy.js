const Boom = require('boom');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module WebhooksPolicy
 * @description Webhooks Policy
 */
module.exports = {

  canRun(request) {
    if (request.headers
      && request.headers.authorization
      && request.headers.authorization === process.env.CRON_KEY) {
      return true;
    }
    logger.warn(
      '[WebhooksPolicy->canRun] Missing or wrong secret provided',
    );
    throw Boom.unauthorized('Missing or wrong secret');
  },

};
