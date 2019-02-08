'use strict';

const Boom = require('boom');
const Client = require('../models/Client');
const HelperService = require('../services/HelperService');
const ErrorService = require('../services/ErrorService');

/**
 * @module ClientController
 * @description Controller for Clients.
 */
module.exports = {

  create: async function (request, reply) {
    try {
      const client = await Client.create(request.payload);
      if (!client) {
        throw Boom.badRequest();
      }
      return reply(client);
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
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  update: async function (request, reply) {
    try {
      const client = await Client.findOneAndUpdate({ _id: request.params.id }, request.payload, {runValidators: true, new: true});
      return reply(client);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  destroy: async function (request, reply) {
    try {
      await Client.remove({ _id: request.params.id });
      return reply().code(204);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  }
};
