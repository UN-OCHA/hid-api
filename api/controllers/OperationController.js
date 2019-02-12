'use strict';

const Boom = require('boom');
const Operation = require('../models/Operation');
const HelperService = require('../services/HelperService');

/**
 * @module OperationController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  create: async function (request, reply) {
    const operation = await Operation.create(request.payload);
    if (!operation) {
      throw Boom.badRequest();
    }
    return reply(operation);
  },

  find: async function (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

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
  },

  update: async function (request, reply) {
    const client = await Operation.findOneAndUpdate({ _id: request.params.id }, request.payload, {runValidators: true, new: true});
    return reply(client);
  },

  destroy: async function (request, reply) {
    await Operation.remove({ _id: request.params.id});
    return reply().code(204);
  }

};
