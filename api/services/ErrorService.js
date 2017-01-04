'use strict';

const Service = require('trails/service');
const Boom = require('boom');

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
      return reply(Boom.badImplementation(err.toString()));
    }
  }
};
