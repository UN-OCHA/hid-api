'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const async = require('async');
const Mailchimp = require('mailchimp-api-v3');
const {google} = require('googleapis');

/**
 * @module ServiceController
 * @description Controller for Services (Mailchimp, GGroup).
 */
module.exports = class ServiceController extends Controller{

  create (request, reply) {
    request.params.model = 'service';
    request.payload.owner = request.params.currentUser._id;
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.create(request, reply);
  }

  find (request, reply) {
    const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
    const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);
    const Service = this.app.orm.Service;

    if (!request.params.currentUser.is_admin) {
      criteria.$or = [
        {'hidden': false},
        {'owner': request.params.currentUser._id},
        {'managers': request.params.currentUser._id}
      ];
    }

    if (!options.populate) {
      options.populate = 'lists managers owner';
    }

    // Do not show deleted lists
    criteria.deleted = false;

    if (criteria.lists) {
      criteria.lists = {$in: criteria.lists.split(',')};
    }

    const that = this;

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
        .catch(err => { that.app.services.ErrorService.handle(err, request, reply); });
    }
    else {
      const Service = this.app.orm.Service;
      const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
      const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);

      if (criteria.lists) {
        const lists = criteria.lists.split(',');
        if (lists.length > 1) {
          criteria.$or = [];
          lists.forEach(function (id) {
            criteria.$or.push({lists: id});
          });
          delete criteria.lists;
        }
      }

      if (criteria.name) {
        if (criteria.name.length < 3) {
          return reply(Boom.badRequest('Name must have at least 3 characters'));
        }
        criteria.name = criteria.name.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{|<|>|\/|"/, '-');
        criteria.name = new RegExp(criteria.name, 'i');
      }

      const that = this;
      const query = this.app.services.HelperService.find('Service', criteria, options);
      let gresults = {};
      query
        .then((results) => {
          gresults = results;
          return Service.count(criteria);
        })
        .then((number) => {
          for (let i = 0; i < gresults.length; i++) {
            gresults[i].sanitize(request.params.currentUser);
          }
          return reply(gresults).header('X-Total-Count', number);
        })
        .catch((err) => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
  }

  update (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.update(request, reply);
  }

  destroy (request, reply) {
    const Service = this.app.orm.Service;
    const User = this.app.orm.User;

    this.log.debug('[ServiceController] (destroy) model = service, query =', request.query, {request: request});
    const that = this;

    const criteria = {};
    criteria['subscriptions.service'] = request.params.id;
    User
      .find(criteria)
      .then(users => {
        async.each(users, function (user, next) {
          for (let j = user.subscriptions.length; j--; ) {
            if (user.subscriptions[j] && user.subscriptions[j].service && user.subscriptions[j].service.toString() === request.params.id) {
              user.subscriptions.splice(j, 1);
            }
          }
          user.markModified('subscriptions');
          user.save((err) => {
            next();
          });
        });
        return users;
      })
      .then(users => {
        return Service.remove({ _id: request.params.id });
      })
      .then(() => {
        reply().code(204);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  mailchimpLists (request, reply) {
    if (request.query.apiKey) {
      const that = this;
      try {
        const mc = new Mailchimp(request.query.apiKey);
        mc.get({
          path: '/lists'
        })
          .then((result) => {
            reply(result);
          })
          .catch((err) => {
            that.app.services.ErrorService.handle(err, request, reply);
          });
      }
      catch (err) {
        reply(Boom.badRequest('Invalid API key'));
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
    const that = this;
    // Find service credentials associated to domain
    ServiceCredentials
      .findOne({ type: 'googlegroup', 'googlegroup.domain': request.query.domain})
      .then((creds) => {
        if (!creds) {
          throw Boom.badRequest();
        }
        Service.googleGroupsAuthorize(creds.googlegroup, function (auth) {
          const service = google.admin('directory_v1');
          service.groups.list({
            auth: auth,
            customer: 'my_customer',
            maxResults: 200
          }, function (err, response) {
            if (err) {
              throw err;
            }
            return reply(response.data.groups);
          });
        });
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }


  // Subscribe a user to a service
  subscribe (request, reply) {
    const User = this.app.orm.User;
    const Service = this.app.orm.Service;
    const ServiceCredentials = this.app.orm.ServiceCredentials;
    const NotificationService = this.app.services.NotificationService;

    const that = this;
    let user = {}, service = {};
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
          if (user.emailIndex(request.payload.email) === -1) {
            throw Boom.badRequest('Wrong email');
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
          return service.subscribeMailchimp(results.user, request.payload.email)
            .then((output) => {
              if (output.statusCode === 200) {
                user.subscriptions.push({email: request.payload.email, service: service});
                user.save((err) => {
                  if (err) {
                    throw err;
                  }
                  else {
                    reply(user);
                  }
                });
              }
              else {
                throw new Error(output);
              }
            });
        }
        else {
          return service.subscribeGoogleGroup(
            results.user,
            request.payload.email,
            results.creds,
            function (err, response) {
              if (!err || (err && err.code === 409)) {
                user.subscriptions.push({email: request.payload.email, service: service});
                user.save((err) => {
                  if (err) {
                    throw err;
                  }
                  else {
                    reply(user);
                  }
                });
              }
              else {
                that.app.services.ErrorService.handle(err, request, reply);
              }
            }
          );
        }
      })
      .then (() => {
        // Send notification to user that he was subscribed to a service
        if (user.id !== request.params.currentUser.id) {
          const notification = {
            type: 'service_subscription',
            user: user,
            createdBy: request.params.currentUser,
            params: { service: service}
          };
          NotificationService.send(notification, () => {});
        }
      })
      .catch(err => {
        if (err.title && err.title === 'Member Exists') {
          // Member already exists in mailchimp
          user.subscriptions.push({email: request.payload.email, service: service});
          user.save((err) => {
            if (err) {
              that.log.error('Error subscribing member to a mailchimp list', {request: request, fail: true, error: err});
              reply(Boom.badImplementation());
            }
            else {
              reply(user);
              if (user.id !== request.params.currentUser.id) {
                const notification = {
                  type: 'service_subscription',
                  user: user,
                  createdBy: request.params.currentUser,
                  params: { service: service}
                };
                NotificationService.send(notification, () => {});
              }
            }
          });
        }
        else {
          that.app.services.ErrorService.handle(err, request, reply);
        }
      });
  }

  unsubscribe (request, reply) {
    const User = this.app.orm.User;
    const Service = this.app.orm.Service;
    const ServiceCredentials = this.app.orm.ServiceCredentials;
    const NotificationService = this.app.services.NotificationService;

    this.log.debug(
      '[ServiceController] Unsubscribing user ' +
      request.params.id +
      ' from ' +
      request.params.serviceId,
      { request: request }
    );

    const that = this;
    let user = {}, service = {};
    let sendNotification = true;
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
        return Service
          .findOne({'_id': request.params.serviceId, deleted: false})
          .then((srv) => {
            if (!srv) {
              throw Boom.badRequest();
            }
            else {
              service = srv;
              return user;
            }
          });
      })
      .then((user) => {
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
        const index = user.subscriptionsIndex(request.params.serviceId);
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
            })
            .catch(err => {
              if (err.status === 404) {
                sendNotification = false;
                user.subscriptions.splice(index, 1);
                user.save();
                return reply(user);
              }
              else {
                throw err;
              }
            });
        }
        else if (service.type === 'googlegroup') {
          service.unsubscribeGoogleGroup(user, result.creds, function (err, response) {
            if (err) {
              if (err.status === 404) {
                sendNotification = false;
                user.subscriptions.splice(index, 1);
                user.save();
                return reply(user);
              }
              else {
                throw err;
              }
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
        if (sendNotification && user.id !== request.params.currentUser.id) {
          const notification = {
            type: 'service_unsubscription',
            user: user,
            createdBy: request.params.currentUser,
            params: { service: service}
          };
          NotificationService.send(notification, () => {});
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }
};
