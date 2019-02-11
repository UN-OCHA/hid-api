'use strict';

const ServiceCredentials = require('../models/ServiceCredentials');
const HelperService = require('../services/HelperService');
const ErrorService = require('../services/ErrorService');

/**
 * @module ServiceCredentialsController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  find: async function (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    try {
      if (request.params.id) {
        criteria._id = request.params.id;
        const result = await ServiceCredentials.findOne(criteria);
        if (!result) {
          throw Boom.notFound();
        }
        return reply(result);
      }
      else {
        const [results, number] = await Promise.all([HelperService.find(ServiceCredentials, criteria, options), ServiceCredentials.count(criteria)]);
        return reply(results).header('X-Total-Count', number);
      }
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  }

};
