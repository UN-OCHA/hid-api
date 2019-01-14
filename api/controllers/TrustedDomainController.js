'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');

/**
 * @module TrustedDomainController
 * @description Controller for Trusted Domains.
 */
module.exports = class TrustedDomainController extends Controller{

  create (request, reply) {
    const TrustedDomain = this.app.orm.TrustedDomain;
    const that = this;
    TrustedDomain
      .create(request.payload)
      .then((domain) => {
        if (!domain) {
          throw Boom.badRequest();
        }
        return reply(domain);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  find (request, reply) {
    const TrustedDomain = this.app.orm.TrustedDomain;
    const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
    const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);
    const that = this;

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
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
    else {
      const query = this.app.services.HelperService.find(TrustedDomain, criteria, options);
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
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
  }

  destroy (request, reply) {
    request.params.model = 'TrustedDomain';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
