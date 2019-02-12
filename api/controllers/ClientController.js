'use strict';

const Boom = require('boom');
const Client = require('../models/Client');
const HelperService = require('../services/HelperService');

/**
 * @module ClientController
 * @description Controller for Clients.
 */
module.exports = {

  create: async function (request, reply) {
    const client = await Client.create(request.payload);
    if (!client) {
      throw Boom.badRequest();
    }
    return reply(client);
  },

  find: async function (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (request.params.id) {
      criteria._id = request.params.id;
      const result = await Client.findOne(criteria);
      if (!result) {
        throw Boom.notFound();
      }
      return reply(result);
    }
    else {
      const results = await HelperService.find(Client, criteria, options);
      const number = await Client.countDocuments(criteria);
      return reply(results).header('X-Total-Count', number);
    }
  },

  update: async function (request, reply) {
    const client = await Client.findOneAndUpdate({ _id: request.params.id }, request.payload, {runValidators: true, new: true});
    return reply(client);
  },

  destroy: async function (request, reply) {
    await Client.remove({ _id: request.params.id });
    return reply().code(204);
  }
};
