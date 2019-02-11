'use strict';

const Boom = require('boom');
const Operation = require('../models/Operation');
const HelperService = require('../services/HelperService');
const ErrorService = require('../services/ErrorService');

/**
 * @module OperationController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  create: async function (request, reply) {
    try {
      const operation = await Operation.create(request.payload);
      if (!operation) {
        throw Boom.badRequest();
      }
      return reply(operation);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  find: async function (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    try {
      if (request.params.id) {
        criteria._id = request.params.id;
        const result = await Operation.findOne(criteria).populate('managers key_roles key_lists');
        if (!result) {
          throw Boom.notFound();
        }
        return reply(result);
      }
      else {
        options.populate = 'managers key_roles key_lists';
        const [results, number] = await Promise.all([HelperService.find(Operation, criteria, options), Operation.countDocuments(criteria)]);
        return reply(results).header('X-Total-Count', number);
      }
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  update: async function (request, reply) {
    try {
      const client = await Operation.findOneAndUpdate({ _id: request.params.id }, request.payload, {runValidators: true, new: true});
      return reply(client);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  destroy: async function (request, reply) {
    try {
      await Operation.remove({ _id: request.params.id});
      return reply().code(204);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  }

};
