'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const Operation = require('../models/Operation');
const HelperService = require('../services/HelperService');

/**
 * @module OperationController
 * @description Generated Trails.js Controller.
 */
module.exports = class OperationController extends Controller{

  create (request, reply) {
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
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);
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
      options.populate = 'managers key_roles key_lists';
      const query = HelperService.find(Operation, criteria, options);
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
    const that = this;
    Operation
      .findOneAndUpdate({ _id: request.params.id }, request.payload, {runValidators: true, new: true})
      .then((client) => {
        reply(client);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  destroy (request, reply) {
    const that = this;
    Operation
      .remove({ _id: request.params.id })
      .then(() => {
        reply().code(204);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

};
