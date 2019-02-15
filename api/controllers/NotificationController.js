'use strict';

const Boom = require('boom');
const Notification = require('../models/Notification');
const HelperService = require('../services/HelperService');

/**
 * @module NotificationController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  find: async function (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    // Force to display notifications of current user
    criteria.user = request.auth.credentials.id;

    const [results, number] = await Promise.all([HelperService.find(Notification, criteria, options), Notification.countDocuments(criteria)]);
    return reply.response(results).header('X-Total-Count', number);

  },

  update: async function (request, reply) {

    if (!request.payload || !request.payload.hasOwnProperty('read') || !request.payload.hasOwnProperty('notified')) {
      throw Boom.badRequest();
    }

    if (request.params.id) {
      let record = await Notification.findOne({_id: request.params.id});
      if (!record) {
        throw Boom.notFound();
      }
      if (record.user.toString() !== request.auth.credentials.id) {
        throw Boom.forbidden();
      }
      record.notified = request.payload.notified;
      record.read = request.payload.read;
      record = await record.save();
      return record;
    }
    else {
      await Notification.update({user: request.auth.credentials.id}, { read: request.payload.read, notified: request.payload.notified }, { multi: true});
      return reply.response().code(204);
    }
  }

};
