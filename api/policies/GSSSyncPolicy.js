'use strict';

const Boom = require('boom');
const GSSSync = require('../models/GSSSync');

/**
 * @module GSSSyncPolicy
 * @description GSSSyncPolicy
 */
module.exports = {

  canDestroy: async function (request, reply) {
    if (request.auth.credentials.is_admin || request.auth.credentials.isManager) {
      return true;
    }
    const gsssync = await GSSSync.findOne({_id: request.params.id}).populate('user');
    if (gsssync.user._id.toString() === request.auth.credentials._id.toString()) {
      return true;
    }
    else {
      throw Boom.unauthorized('You are not allowed to delete this item');
    }
  }
};
