'use strict';

const Boom = require('boom');
const TrustedDomain = require('../models/TrustedDomain');
const HelperService = require('../services/HelperService');
const ErrorService = require('../services/ErrorService');

/**
 * @module TrustedDomainController
 * @description Controller for Trusted Domains.
 */
module.exports = {

  create: async function (request, reply) {
    try {
      const domain = await TrustedDomain.create(request.payload);
      if (!domain) {
        throw Boom.badRequest();
      }
      return reply(domain);
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
        const result = await TrustedDomain.findOne(criteria).populate('list');
        if (!result) {
          throw Boom.notFound();
        }
        return reply(result);
      }
      else {
        const results = await HelperService.find(TrustedDomain, criteria, options).populate('list');
        const number = await TrustedDomain.countDocuments(criteria);
        return reply(results).header('X-Total-Count', number);
      }
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  destroy: async function (request, reply) {
    try {
      await TrustedDomain.remove({ _id: request.params.id });
      return reply().code(204);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  }
};
