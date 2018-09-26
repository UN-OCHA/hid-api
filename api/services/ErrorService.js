'use strict';

const Service = require('trails/service');
const Boom = require('boom');

/**
 * @module ErrorService
 * @description Errors Service
 */
module.exports = class ErrorService extends Service {
  handle(err, request, reply) {
    if (err.isBoom) {
      return reply(err);
    }
    else {
      if (err.name && err.name === 'ValidationError') {
        this.log.error('Validation error', {request: request, error: err.toString()});
        return reply(Boom.badRequest(err.message));
      }
      this.log.error('Unexpected error', {request: request, error: err.toString()});
      reply(Boom.badImplementation());
      if (process.env.NODE_ENV !== 'testing' && process.env.NODE_ENV !== 'local') {
        const newrelic = require('newrelic');
        // Send the error to newrelic
        newrelic.noticeError(err.toString());
      }
    }
  }

  handleWithoutReply(err) {
    this.log.error('Unexpected error', {error: err.toString()});
    if (process.env.NODE_ENV !== 'testing' && process.env.NODE_ENV !== 'local') {
      const newrelic = require('newrelic');
      // Send the error to newrelic
      newrelic.noticeError(err.toString());
    }
  }
};
