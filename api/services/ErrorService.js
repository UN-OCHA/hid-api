

const Boom = require('boom');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module ErrorService
 * @description Errors Service
 */
module.exports = {
  handle(err, request, reply) {
    if (err.isBoom) {
      return reply(err);
    }
    if (err.name && err.name === 'ValidationError') {
      logger.error('Validation error', { request, error: err.toString() });
      return reply(Boom.badRequest(err.message));
    }
    logger.error('Unexpected error', { request, error: err.toString() });
    reply(Boom.badImplementation());
    if (process.env.NODE_ENV !== 'testing') {
      const newrelic = require('newrelic');
      // Send the error to newrelic
      newrelic.noticeError(err.toString());
    }
  },

  handleWithoutReply(err) {
    logger.error('Unexpected error', { error: err.toString() });
    if (process.env.NODE_ENV !== 'testing') {
      const newrelic = require('newrelic');
      // Send the error to newrelic
      newrelic.noticeError(err.toString());
    }
  },
};
