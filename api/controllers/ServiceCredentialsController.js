'use strict';

const Controller = require('trails/controller');
const ServiceCredentials = require('../models/ServiceCredentials');
const HelperService = require('../services/HelperService');
const ErrorService = require('../services/ErrorService');

/**
 * @module ServiceCredentialsController
 * @description Generated Trails.js Controller.
 */
module.exports = class ServiceCredentialsController extends Controller{

  find (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);
    const that = this;

    if (request.params.id) {
      criteria._id = request.params.id;
      ServiceCredentials
        .findOne(criteria)
        .then(result => {
          if (!result) {
            throw Boom.notFound();
          }
          return reply(result);
        })
        .catch(err => {
          ErrorService.handle(err, request, reply);
        });
    }
    else {
      const query = HelperService.find(ServiceCredentials, criteria, options);
      let gresults = {};
      query
        .then((results) => {
          gresults = results;
          return ServiceCredentials.count(criteria);
        })
        .then((number) => {
          return reply(gresults).header('X-Total-Count', number);
        })
        .catch((err) => {
          ErrorService.handle(err, request, reply);
        });
    }
  }

};
