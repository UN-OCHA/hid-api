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
          .catch(err => {
            that.app.services.ErrorService.handle(err, request, reply);
          });
    }
    else {
      const query = this.app.services.HelperService.find('Client', criteria, options);
      let gresults = {};
      query
        .then((results) => {
          gresults = results;
          return Client.count(criteria);
        })
        .then((number) => {
          return reply(gresults).header('X-Total-Count', number);
        })
        .catch((err) => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
  }

  update (request, reply) {
    const Model = this.app.orm.client,
      that = this;
    Model
      .findOneAndUpdate({ _id: request.params.id }, request.payload, {runValidators: true, new: true})
        .then((client) => {
          reply(client);
        })
        .catch(err => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
  }

  destroy (request, reply) {
    request.params.model = 'client';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
