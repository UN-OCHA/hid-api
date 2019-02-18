

const Boom = require('boom');

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
    throw Boom.unauthorized('Missing or wrong secret');
  },

};
