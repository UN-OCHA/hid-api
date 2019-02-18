

const Boom = require('boom');
const Operation = require('../models/Operation');
const HelperService = require('../services/HelperService');

/**
 * @module OperationController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  async create(request) {
    const operation = await Operation.create(request.payload);
    if (!operation) {
      throw Boom.badRequest();
    }
    return operation;
  },

  async find(request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (request.params.id) {
      criteria._id = request.params.id;
      const result = await Operation.findOne(criteria).populate('managers key_roles key_lists');
      if (!result) {
        throw Boom.notFound();
      }
      return result;
    }
    options.populate = 'managers key_roles key_lists';
    const [results, number] = await Promise.all([
      HelperService.find(Operation, criteria, options),
      Operation.countDocuments(criteria)
    ]);
    return reply.response(results).header('X-Total-Count', number);
  },

  async update(request) {
    const client = await Operation.findOneAndUpdate({ _id: request.params.id },
      request.payload, { runValidators: true, new: true });
    return client;
  },

  async destroy(request, reply) {
    await Operation.remove({ _id: request.params.id });
    return reply.response().code(204);
  },

};
