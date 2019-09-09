const Boom = require('boom');
const TrustedDomain = require('../models/TrustedDomain');
const HelperService = require('../services/HelperService');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module TrustedDomainController
 * @description CRUD Controller for Trusted Domains.
 */
module.exports = {

  async create(request) {
    const domain = await TrustedDomain.create(request.payload);
    if (!domain) {
      logger.warn(
        '[TrustedDomainController->create] Bad request',
        { request: request.payload },
      );
      throw Boom.badRequest();
    }
    return domain;
  },

  async find(request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (request.params.id) {
      criteria._id = request.params.id;
      const result = await TrustedDomain.findOne(criteria).populate('list');
      if (!result) {
        logger.warn(
          `[TrustedDomainController->find] Could not find TrustedDomain ${request.params.id}`,
        );
        throw Boom.notFound();
      }
      return result;
    }
    const [results, number] = await Promise.all([HelperService.find(TrustedDomain, criteria, options).populate('list'), TrustedDomain.countDocuments(criteria)]);
    return reply.response(results).header('X-Total-Count', number);
  },

  async destroy(request, reply) {
    await TrustedDomain.remove({ _id: request.params.id });
    logger.info(
      `[TrustedDomainController->destroy] Deleted TrustedDomain ${request.params.id}`,
    );
    return reply.response().code(204);
  },
};
