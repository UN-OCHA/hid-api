'use strict';

const Controller = require('trails-controller');
const Boom = require('boom');
const Mailchimp = require('mailchimp-api-v3');

/**
 * @module ServiceController
 * @description Generated Trails.js Controller.
 */
module.exports = class ServiceController extends Controller{

  create (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.create(request, reply);
  }

  find (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.find(request, reply);
  }

  update (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.update(request, reply);
  }

  destroy (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }

  mailchimpLists (request, reply) {
    if (request.query.apiKey) {
      var that = this;
      try {
        var mc = new Mailchimp(request.query.apiKey);
        mc.get({
          path: '/lists'
        })
        .then((result) => {
          reply(result);
        })
        .catch((err) => {
          that.app.services.ErrorService.handle(err, reply);
        });
      }
      catch (err) {
        that.app.services.ErrorService.handle(err, reply);
      }
    }
    else {
      reply(Boom.badRequest('missing Mailchimp API Key'));
    }
  }
};
