

const Boom = require('boom');
const Operation = require('../models/Operation');
const HelperService = require('../services/HelperService');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module OperationController
 * @description CRUD controller for operation pages.
 */
module.exports = {

  async create(request) {
    const operation = await Operation.create(request.payload);
    if (!operation) {
      logger.warn(
        '[OperationController->create] Bad request',
        { request: request.payload },
      );
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
        logger.warn(
          `[OperationController->find] Operation ${request.params.id} not found`,
        );
        throw Boom.notFound();
      }
      return result;
    }
    options.populate = 'managers key_roles key_lists';
    const [results, number] = await Promise.all([
      HelperService.find(Operation, criteria, options),
      Operation.countDocuments(criteria),
    ]);
    return reply.response(results).header('X-Total-Count', number);
  },

  async update(request) {
    logger.info(
      `[OperationController->update] Updating operation ${request.params.id}`,
      { request: request.payload },
    );
    const client = await Operation.findOneAndUpdate({ _id: request.params.id },
      request.payload, { runValidators: true, new: true });
    return client;
  },

  async destroy(request, reply) {
    logger.info(
      `[OperationController->destroy] Deleting operation ${request.params.id}`,
    );
    await Operation.remove({ _id: request.params.id });
    return reply.response().code(204);
  },

};
