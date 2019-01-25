'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const TrustedDomain = require('../models/TrustedDomain');
const HelperService = require('../services/HelperService');
const ErrorService = require('../services/ErrorService');

/**
 * @module TrustedDomainController
 * @description Controller for Trusted Domains.
 */
module.exports = class TrustedDomainController extends Controller{

  create (request, reply) {
    TrustedDomain
      .create(request.payload)
      .then((domain) => {
        if (!domain) {
          throw Boom.badRequest();
        }
        return reply(domain);
      })
      .catch(err => {
        ErrorService.handle(err, request, reply);
      });
  }

  find (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    if (request.params.id) {
      criteria._id = request.params.id;
      TrustedDomain
        .findOne(criteria)
        .populate('list')
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
      const query = HelperService.find(TrustedDomain, criteria, options);
      let gresults = {};
      query
        .populate('list')
        .then((results) => {
          gresults = results;
          return TrustedDomain.count(criteria);
        })
        .then((number) => {
          return reply(gresults).header('X-Total-Count', number);
        })
        .catch((err) => {
          ErrorService.handle(err, request, reply);
        });
    }
  }

  destroy (request, reply) {
    TrustedDomain
      .remove({ _id: request.params.id })
      .then(() => {
        reply().code(204);
      })
      .catch(err => {
        ErrorService.handle(err, request, reply);
      });
  }
};
