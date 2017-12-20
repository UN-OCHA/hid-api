'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');

/**
 * @module CronPolicy
 * @description CronPolicy
 */
module.exports = class CronPolicy extends Policy {

  canRun (request, reply) {
    if (request.query.cron_key && request.query.cron_key === process.env.CRON_KEY) {
      return reply();
    }
    else {
      return reply(Boom.unauthorized('Missing or wrong cron key'));
    }
  }
};
