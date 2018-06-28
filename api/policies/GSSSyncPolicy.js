'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');

/**
 * @module GSSSyncPolicy
 * @description GSSSyncPolicy
 */
module.exports = class GSSSyncPolicy extends Policy {

  canDestroy (request, reply) {
    if (request.params.currentUser.is_admin || request.params.currentUser.isManager) {
      return reply();
    }
    const GSSSync = this.app.orm.GSSSync;
    const that = this;
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
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }
};
