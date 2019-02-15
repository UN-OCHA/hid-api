'use strict';

const Boom = require('boom');
const User = require('../models/User');

/**
 * @module UserPolicy
 * @description User Policy
 */
async function _canUpdate (request, reply) {
 if (!request.auth.credentials.is_admin &&
   !request.auth.credentials.isManager &&
   request.auth.credentials.id !== request.params.id) {
   throw Boom.forbidden('You need to be an admin or a manager or the current user');
 }
 else {
   if (request.auth.credentials.isManager &&
     request.auth.credentials.id !== request.params.id) {
     // If the user is a manager, make sure he is not trying to edit
     // an admin account.
     const user = await User.findById(request.params.id);
     if (!user) {
       throw Boom.notFound();
     }
     if (user.is_admin) {
       throw Boom.forbidden('You are not authorized to edit an admin account');
     }
   }
   return true;
 }
}

module.exports = {

  canCreate: function (request, reply) {
    if (!request.auth.credentials) {
      if (!request.payload.email) {
        throw Boom.badRequest('You need to register with an email address');
      }
    }
    else {
      if (!request.auth.credentials.is_admin && !request.auth.credentials.isManager) {
        throw Boom.forbidden('Only administrators and managers can create users');
      }
    }
    return true;
  },

  canUpdate: _canUpdate,

  canDestroy: async function (request, reply) {
    if (request.auth.credentials.is_admin ||
      request.auth.credentials.id === request.params.id) {
      return true;
    }
    else {
      const user = await User.findOne({_id: request.params.id}).populate('createdBy');
      if (user.createdBy &&
        user.createdBy.id === request.auth.credentials.id &&
        user.email_verified === false &&
        request.auth.credentials.isManager) {
        return true;
      }
      else {
        throw Boom.unauthorized('You are not allowed to do this operation');
      }
    }
  },

  canClaim: _canUpdate
};
