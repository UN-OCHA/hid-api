'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');

/**
 * @module ClientController
 * @description Controller for Clients.
 */
module.exports = class ClientController extends Controller{

  create (request, reply) {
    const Client = this.app.orm.Client;
    const that = this;
    Client
      .create(request.payload)
      .then((client) => {
        if (!client) {
          throw Boom.badRequest();
        }
        return reply(client);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  find (request, reply) {
    const Client = this.app.orm.Client;
    const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
    const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);
    const that = this;

    if (request.params.id) {
      criteria._id = request.params.id;
      Client
        .findOne(criteria)
        .then(result => {
          if (!result) {
            throw Boom.notFound();
          }
          return reply(result);
        })
        .catch(err => { that.app.services.ErrorService.handle(err, request, reply); });
    }
    else {
      const query = this.app.services.HelperService.find('Client', criteria, options);
      query
        .then((results) => {
          return Client
            .count(criteria)
            .then((number) => {
              return {result: results, number: number};
            });
        })
        .then((result) => {
          return reply(result.result).header('X-Total-Count', result.number);
        })
        .catch((err) => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
  }

  update (request, reply) {
    request.params.model = 'client';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.update(request, reply);
  }

  destroy (request, reply) {
    request.params.model = 'client';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
