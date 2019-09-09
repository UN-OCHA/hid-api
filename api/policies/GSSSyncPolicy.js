const Boom = require('boom');
const GSSSync = require('../models/GSSSync');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module GSSSyncPolicy
 * @description GSSSyncPolicy
 */
module.exports = {

  async canDestroy(request) {
    if (request.auth.credentials.is_admin || request.auth.credentials.isManager) {
      return true;
    }
    const gsssync = await GSSSync.findOne({ _id: request.params.id }).populate('user');
    if (gsssync.user._id.toString() === request.auth.credentials._id.toString()) {
      return true;
    }
    logger.warn(
      `[GSSSyncPolicy->canDestroy] User ${request.auth.credentials._id.toString()} is not allowed to delete ${request.params.id}`,
    );
    throw Boom.unauthorized('You are not allowed to delete this item');
  },
};
