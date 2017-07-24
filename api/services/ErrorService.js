'use strict';

const Service = require('trails/service');
const Boom = require('boom');
const newrelic = require('newrelic');

/**
 * @module ErrorService
 * @description Errors Service
 */
module.exports = class ErrorService extends Service {
  handle(err, request, reply) {
    this.log.error('Unexpected error', {request: request, error: err});
    if (err.isBoom) {
      return reply(err);
    }
    else {
      reply(Boom.badImplementation());
      // Send the error to newrelic
      newrelic.noticeError(err);
    }
  }
};
