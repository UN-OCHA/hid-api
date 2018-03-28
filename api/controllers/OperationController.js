'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');

/**
 * @module OperationController
 * @description Generated Trails.js Controller.
 */
module.exports = class OperationController extends Controller{

  create (request, reply) {
    const Operation = this.app.orm.Operation;
    const that = this;
    Operation
      .create(request.payload)
      .then((operation) => {
        if (!operation) {
          throw Boom.badRequest();
        }
        return reply(operation);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  find (request, reply) {
    const Operation = this.app.orm.Operation;
    const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
    const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);
    const that = this;

    if (request.params.id) {
      criteria._id = request.params.id;
      Operation
        .findOne(criteria)
        .populate('managers key_roles key_lists')
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
      const query = this.app.services.HelperService.find('Operation', criteria, options);
      let gresults = {};
      query
        .then((results) => {
          gresults = results;
          return Operation.count(criteria);
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
    const Model = this.app.orm.Operation,
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
    request.params.model = 'Operation';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }

};
