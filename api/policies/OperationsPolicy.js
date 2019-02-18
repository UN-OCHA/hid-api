

const Boom = require('boom');
const Operation = require('../models/Operation');

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
      throw Boom.notFound();
    }
    if (op.managersIndex(request.auth.credentials) !== -1) {
      return true;
    }
    throw Boom.forbidden();
  },


};
