'use strict';

const Boom = require('boom');

/**
 * @module CronPolicy
 * @description CronPolicy
 */
module.exports = {

  canRun (request, reply) {
    if (request.headers && request.headers.authorization && request.headers.authorization === process.env.CRON_KEY) {
      return true;
    }
    else {
      throw Boom.unauthorized('Missing or wrong cron key');
    }
  }
};
