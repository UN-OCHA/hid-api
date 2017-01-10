'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const Mailchimp = require('mailchimp-api-v3');
const async = require('async');
const google = require('googleapis');

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
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    const Service = this.app.orm.Service;

    if (!request.params.currentUser.is_admin) {
      criteria.$or = [{'hidden': false}, {'owner': request.params.currentUser._id}, {'managers': request.params.currentUser._id}];
    }

    if (!options.populate) {
      options.populate = 'lists managers owner';
    }

    // Do not show deleted lists
    criteria.deleted = {$in: [false, null]};

    if (criteria.lists) {
      criteria.lists = {$in: criteria.lists.split(',')};
    }

    let that = this;

    if (request.params.id) {
      criteria._id = request.params.id;
      Service
        .findOne(criteria)
        .populate(options.populate)
        .then(result => {
          if (!result) {
            throw Boom.notFound();
          }

          result.sanitize(request.params.currentUser);
          return reply(result);
        })
        .catch(err => { that.app.services.ErrorService.handle(err, reply); });
    }
    else {
      let response = FootprintService.find('service', criteria, options);
      let count = FootprintService.count('service', criteria);
      count.then(number => {
        response
          .then(results => {
            if (!results) {
              return Boom.notFound();
            }
            for (var i = 0; i < results.length; i++) {
              results[i].sanitize(request.params.currentUser);
            }
            return reply(results).header('X-Total-Count', number);
          })
          .catch(err => {
            that.app.services.ErrorService.handle(err, reply);
          });
      });
    }
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

  // Get google groups from a domain
  googleGroups(request, reply) {
    const ServiceCredentials = this.app.orm.ServiceCredentials;
    const Service = this.app.orm.Service;
    let that = this;
    // Find service credentials associated to domain
    ServiceCredentials
      .findOne({ type: 'googlegroup', 'googlegroup.domain': request.query.domain})
      .then((creds) => {
        if (!creds) {
          throw Boom.badRequest();
        }
        Service.googleGroupsAuthorize(creds.googlegroup, function (auth) {
          var service = google.admin('directory_v1');
          service.groups.list({
            auth: auth,
            customer: 'my_customer',
            maxResults: 200
          }, function (err, response) {
            if (err) {
              throw err;
            }
            var groups = response.groups;
            return reply(groups);
          });
        });
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }


  // Subscribe a user to a service
  subscribe (request, reply) {
    const User = this.app.orm.User;
    const Service = this.app.orm.Service;
    const ServiceCredentials = this.app.orm.ServiceCredentials;

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
      .then((result) => {
        user = result.user;
        service = result.service;
        if (service.type === 'googlegroup') {
          return ServiceCredentials
            .findOne({type: 'googlegroup', 'googlegroup.domain': service.googlegroup.domain})
            .then((creds) => {
              if (!creds) {
                throw new Error('Could not find service credentials');
              }
              result.creds = creds;
              return result;
            });
        }
        else {
          result.creds = null;
          return result;
        }
      })
      .then((results) => {
        user = results.user;
        service = results.service;
        if (service.type === 'mailchimp') {
          return service.subscribeMailchimp(results.user)
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
        }
        else {
          return service.subscribeGoogleGroup(results.user, results.creds, function (err, response) {
            if (err) {
              throw err;
            }
            else {
              user.subscriptions.push(service);
              user.save();
              return reply(user);
            }
          });
        }
      })
      .then (() => {
        // Send notification to user that he was subscribed to a service
        if (user.id !== request.params.currentUser.id) {
          const NotificationService = that.app.services.NotificationService;
          var notification = {type: 'service_subscription', user: user, createdBy: request.params.currentUser, params: { service: service}};
          NotificationService.send(notification, () => {});
        }
      })
      .catch(err => {
        if (err.title === 'Member Exists') {
          // Member already exists in mailchimp
          user.subscriptions.push(service);
          user.save();
          reply(user);
          if (user.id !== request.params.currentUser.id) {
            const NotificationService = that.app.services.NotificationService;
            var notification = {type: 'service_subscription', user: user, createdBy: request.params.currentUser, params: { service: service}};
            NotificationService.send(notification, () => {});
          }
        }
        else {
          that.app.services.ErrorService.handle(err, reply);
        }
      });
  }

  unsubscribe (request, reply) {
    const User = this.app.orm.User;
    const Service = this.app.orm.Service;
    const ServiceCredentials = this.app.orm.ServiceCredentials;

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
        service = user.subscriptions[index];
        if (service.type === 'googlegroup') {
          return ServiceCredentials
            .findOne({type: 'googlegroup', 'googlegroup.domain': service.googlegroup.domain})
            .then((creds) => {
              if (!creds) {
                throw new Error('Could not find service credentials');
              }
              return {user: user, creds: creds};
            });
        }
        else {
          return {user: user, creds: null};
        }
      })
      .then((result) => {
        user = result.user;
        var index = user.subscriptionsIndex(request.params.serviceId);
        if (service.type === 'mailchimp') {
          return service.unsubscribeMailchimp(user)
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
        }
        else if (service.type === 'googlegroup') {
          service.unsubscribeGoogleGroup(user, result.creds, function (err, response) {
            if (err) {
              throw err;
            }
            else {
              user.subscriptions.splice(index, 1);
              user.save();
              return reply(user);
            }
          });
        }
      })
      .then (() => {
        // Send notification to user that he was subscribed to a service
        if (user.id !== request.params.currentUser.id) {
          const NotificationService = that.app.services.NotificationService;
          var notification = {type: 'service_unsubscription', user: user, createdBy: request.params.currentUser, params: { service: service}};
          NotificationService.send(notification, () => {});
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }
};
