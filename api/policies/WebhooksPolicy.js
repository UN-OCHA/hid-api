'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');

/**
 * @module WebhooksPolicy
 * @description Webhooks Policy
 */
module.exports = class WebhooksPolicy extends Policy {

  canRun (request, reply) {
    if (request.query.secret && request.query.secret === process.env.CRON_KEY) {
      return reply();
    }
    else {
      return reply(Boom.unauthorized('Missing or wrong secret'));
    }
  }

};
