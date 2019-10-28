const Boom = require('@hapi/boom');
const Operation = require('../models/Operation');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module OperationsPolicy
 * @description Operations Policy
 */
module.exports = {

  async canUpdateOperation(request) {
    // If user is a global manager or admin, allow it
    if (request.auth.credentials.is_admin || request.auth.credentials.isManager) {
      return true;
    }

    // Otherwise check if it is a manager of the operation list
    const op = await Operation.findOne({ _id: request.params.id }).populate('managers');
    if (!op) {
      logger.warn(
        `[OperationsPolicy->canUpdateOperation] Can not find operation ${request.params.id}`,
      );
      throw Boom.notFound();
    }
    if (op.managersIndex(request.auth.credentials) !== -1) {
      return true;
    }
    logger.warn(
      `[OperationsPolicy->canUpdateOperation] User ${request.auth.credentials.id} can not update operation ${request.params.id}`,
    );
    throw Boom.forbidden();
  },


};
