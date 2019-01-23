'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');
const User = require('../models/User');

/**
 * @module UserPolicy
 * @description User Policy
 */
module.exports = class UserPolicy extends Policy {

  canCreate (request, reply) {
    if (!request.params.currentUser) {
      if (!request.payload.email) {
        return reply(Boom.badRequest('You need to register with an email address'));
      }
    }
    else {
      if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager) {
        return reply(Boom.forbidden('Only administrators and managers can create users'));
      }
    }
    reply();
  }

  canUpdate (request, reply) {
    if (!request.params.currentUser.is_admin &&
      !request.params.currentUser.isManager &&
      request.params.currentUser.id !== request.params.id) {
      return reply(Boom.forbidden('You need to be an admin or a manager or the current user'));
    }
    else {
      if (request.params.currentUser.isManager &&
        request.params.currentUser.id !== request.params.id) {
        // If the user is a manager, make sure he is not trying to edit
        // an admin account.
        const that = this;
        User
          .findById(request.params.id)
          .then((user) => {
            if (!user) {
              return reply(Boom.notFound());
            }
            if (user.is_admin) {
              return reply(Boom.forbidden('You are not authorized to edit an admin account'));
            }
            else {
              return reply();
            }
          })
          .catch(err => {
            that.app.services.ErrorService.handle(err, request, reply);
          });
      }
      else {
        reply();
      }
    }
  }

  canDestroy (request, reply) {
    if (request.params.currentUser.is_admin ||
      request.params.currentUser.id === request.params.id) {
      return reply();
    }
    else {
      const that = this;
      User
        .findOne({_id: request.params.id})
        .populate('createdBy')
        .then((user) => {
          if (user.createdBy &&
            user.createdBy.id === request.params.currentUser.id &&
            user.email_verified === false &&
            request.params.currentUser.isManager) {
            return reply();
          }
          else {
            return reply(Boom.unauthorized('You are not allowed to do this operation'));
          }
        })
        .catch((err) => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
  }

  canClaim (request, reply) {
    this.canUpdate(request, reply);
  }
};
