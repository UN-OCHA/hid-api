'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');
const Operation = require('../models/Operation');

/**
 * @module OperationsPolicy
 * @description Operations Policy
 */
module.exports = class OperationsPolicy extends Policy {

  canUpdateOperation (request, reply) {
    // If user is a global manager or admin, allow it
    if (request.params.currentUser.is_admin || request.params.currentUser.isManager) {
      return reply();
    }

    // Otherwise check if it is a manager of the operation list
    const that = this;
    Operation
      .findOne({_id: request.params.id})
      .populate('managers')
      .then((op) => {
        if (!op) {
          throw Boom.notFound();
        }
        if (op.managersIndex(request.params.currentUser) !== -1) {
          return reply();
        }
        else {
          throw Boom.forbidden();
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }


};
