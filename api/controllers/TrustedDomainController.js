'use strict';

const Boom = require('boom');
const TrustedDomain = require('../models/TrustedDomain');
const HelperService = require('../services/HelperService');

/**
 * @module TrustedDomainController
 * @description Controller for Trusted Domains.
 */
module.exports = {

  create: async function (request, reply) {
    const domain = await TrustedDomain.create(request.payload);
    if (!domain) {
      throw Boom.badRequest();
    }
    return domain;
  },

  find: async function (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (request.params.id) {
      criteria._id = request.params.id;
      const result = await TrustedDomain.findOne(criteria).populate('list');
      if (!result) {
        throw Boom.notFound();
      }
      return result;
    }
    else {
      const [results, number] = await Promise.all([HelperService.find(TrustedDomain, criteria, options).populate('list'), TrustedDomain.countDocuments(criteria)]);
      return reply.response(results).header('X-Total-Count', number);
    }
  },

  destroy: async function (request, reply) {
    await TrustedDomain.remove({ _id: request.params.id });
    return reply.response().code(204);
  }
};
