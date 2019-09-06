

const Boom = require('boom');
const ServiceCredentials = require('../models/ServiceCredentials');
const HelperService = require('../services/HelperService');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module ServiceCredentialsController
 * @description Handles display of service credentials (google groups credentials)
 */
module.exports = {

  async find(request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (request.params.id) {
      criteria._id = request.params.id;
      const result = await ServiceCredentials.findOne(criteria);
      if (!result) {
        logger.warn(
          `[ServiceCredentialsController->find] ServiceCredentials ${request.params.id} not found`,
        );
        throw Boom.notFound();
      }
      return result;
    }
    const [results, number] = await Promise.all([
      HelperService.find(ServiceCredentials, criteria, options),
      ServiceCredentials.count(criteria),
    ]);
    return reply.response(results).header('X-Total-Count', number);
  },

};
