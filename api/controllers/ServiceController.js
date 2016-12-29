'use strict';

const Controller = require('trails-controller');
const Boom = require('boom');
const Mailchimp = require('mailchimp-api-v3');
const async = require('async');

/**
 * @module ServiceController
 * @description Generated Trails.js Controller.
 */
module.exports = class ServiceController extends Controller{

  create (request, reply) {
    request.params.model = 'service';
    request.payload.owner = request.params.currentUser._id;
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.create(request, reply);
  }

  find (request, reply) {
    request.params.model = 'service';
    if (!request.params.currentUser.is_admin) {
      request.query.$or = [{'hidden': false}, {'owner': request.params.currentUser._id}];
    }
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.find(request, reply);
  }

  update (request, reply) {
    // TODO: make sure user is owner of the service or admin
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.update(request, reply);
  }

  destroy (request, reply) {
    // TODO: make sure user is owner of the service or admin
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

  // Subscribe a user to a service
  subscribe (request, reply) {
    const User = this.app.orm.User;
    const Service = this.app.orm.Service;

    let that = this,
     user = {},
     service = {};
    User
      .findOne({'_id': request.params.id})
      .then((user) => {
        if (!user) {
          throw Boom.notFound();
        }
        else {
          if (user.subscriptionsIndex(request.payload.service) !== -1) {
            throw Boom.badRequest('User is already subscribed');
          }
          else {
            return user;
          }
        }
      })
      .then((user) => {
        return Service
          .findOne({'_id': request.payload.service, deleted: false})
          .then((service) => {
            if (!service) {
              throw Boom.badRequest();
            }
            else {
              return {user: user, service: service};
            }
          });
      })
      .then((results) => {
        user = results.user;
        service = results.service;
        return service.subscribe(results.user)
          .then((output) => {
            if (output.statusCode === 200) {
              user.subscriptions.push(service);
              user.save();
              return reply(user);
            }
            else {
              throw new Error(output);
            }
          });
      })
      .catch(err => {
        if (err.title === 'Member Exists') {
          // Member already exists in mailchimp
          user.subscriptions.push(service);
          user.save();
          return reply(user);
        }
        else {
          that.app.services.ErrorService.handle(err, reply);
        }
      });
  }

  unsubscribe (request, reply) {
    const User = this.app.orm.User;
    const Service = this.app.orm.Service;

    let that = this;
    User
      .findOne({'_id': request.params.userId})
      .then((user) => {
        if (!user) {
          throw Boom.notFound();
        }
        else {
          if (user.subscriptionsIndex(request.params.serviceId) === -1) {
            throw Boom.notFound();
          }
          else {
            return user;
          }
        }
      })
      .then((user) => {
        var index = user.subscriptionsIndex(request.params.serviceId);
        var service = user.subscriptions[index];
        return service.unsubscribe(user)
          .then((output) => {
            if (output.statusCode === 204) {
              user.subscriptions.splice(index, 1);
              user.save();
              return reply(user);
            }
            else {
              throw new Error(output);
            }
          });
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }
};
