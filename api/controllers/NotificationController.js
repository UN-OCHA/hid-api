'use strict';

const Controller = require('trails-controller');
const Boom = require('boom');

/**
 * @module NotificationController
 * @description Generated Trails.js Controller.
 */
module.exports = class NotificationController extends Controller{

  find (request, reply) {
    request.params.model = 'notification';
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    let criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    let that = this;

    if (criteria.lastPull) {
      criteria.createdAt = {$gt: criteria.lastPull};
      delete criteria.lastPull;
    }

    this.log.debug('[NotificationController] (find) criteria = ', criteria);

    FootprintService
      .find('notification', criteria, options)
      .then((results) => {
        reply (results);
      })
      .catch(err => {
        that.log.error(err);
        reply (Boom.badImplementation());
      });
  }

};
