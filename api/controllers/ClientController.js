

const Boom = require('boom');
const Client = require('../models/Client');
const HelperService = require('../services/HelperService');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module ClientController
 * @description Controller for Clients.
 */
module.exports = {

  async create(request) {
    const client = await Client.create(request.payload);
    if (!client) {
      logger.warn(
        '[ClientController->create] Could not create client due to bad request',
        { request: request }
      );
      throw Boom.badRequest();
    }
    return client;
  },

  async find(request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (request.params.id) {
      criteria._id = request.params.id;
      const result = await Client.findOne(criteria);
      if (!result) {
        logger.warn(
          '[ClientController->find] Could not find client with ID ' + request.params.id
        );
        throw Boom.notFound();
      }
      return result;
    }
    const results = await HelperService.find(Client, criteria, options);
    const number = await Client.countDocuments(criteria);
    return reply.response(results).header('X-Total-Count', number);
  },

  async update(request) {
    logger.info(
      '[ClientController->update] Updating client ' + request.params.id,
      { request: request.payload }
    );
    const client = await Client
      .findOneAndUpdate(
        { _id: request.params.id },
        request.payload,
        { runValidators: true, new: true },
      );
    return client;
  },

  async destroy(request, reply) {
    logger.info(
      '[ClientController->destroy] Removing client ' + request.params.id
    );
    await Client.remove({ _id: request.params.id });
    return reply.response().code(204);
  },
};
