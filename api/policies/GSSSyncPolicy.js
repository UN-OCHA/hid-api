'use strict';

const Boom = require('boom');
const GSSSync = require('../models/GSSSync');
const ErrorService = require('../services/ErrorService');

/**
 * @module GSSSyncPolicy
 * @description GSSSyncPolicy
 */
module.exports = {

  canDestroy: function (request, reply) {
    if (request.params.currentUser.is_admin || request.params.currentUser.isManager) {
      return reply();
    }
    GSSSync
      .findOne({_id: request.params.id})
      .populate('user')
      .then((gsssync) => {
        if (gsssync.user._id.toString() === request.params.currentUser._id.toString()) {
          return reply();
        }
        else {
          return reply(Boom.unauthorized('You are not allowed to delete this item'));
        }
      })
      .catch((err) => {
        ErrorService.handle(err, request, reply);
      });
  }
};
