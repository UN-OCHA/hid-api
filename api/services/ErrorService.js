'use strict';

const Service = require('trails/service');
const Boom = require('boom');
const newrelic = require('newrelic');

/**
 * @module ErrorService
 * @description Errors Service
 */
module.exports = class ErrorService extends Service {
  handle(err, reply) {
    this.log.error(err);
    if (err.isBoom) {
      return reply(err);
    }
    else {
      reply(Boom.badImplementation(err.toString()));
      // Send the error to newrelic
      newrelic.noticeError(err);
    }
  }
};
