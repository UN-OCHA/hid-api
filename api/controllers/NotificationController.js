'use strict';

const Boom = require('boom');
const Notification = require('../models/Notification');
const HelperService = require('../services/HelperService');
const ErrorService = require('../services/ErrorService');

/**
 * @module NotificationController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  find: async function (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    try {
      // Force to display notifications of current user
      criteria.user = request.params.currentUser.id;

      const [results, number] = await Promise.all([HelperService.find(Notification, criteria, options), Notification.countDocuments(criteria)]);
      return reply(results).header('X-Total-Count', number);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }

  },

  update: async function (request, reply) {

    if (!request.payload || !request.payload.hasOwnProperty('read') || !request.payload.hasOwnProperty('notified')) {
      return reply(Boom.badRequest());
    }

    try {
      if (request.params.id) {
        let record = await Notification.findOne({_id: request.params.id});
        if (!record) {
          throw Boom.notFound();
        }
        if (record.user.toString() !== request.params.currentUser.id) {
          throw Boom.forbidden();
        }
        record.notified = request.payload.notified;
        record.read = request.payload.read;
        record = await record.save();
        return reply(record);
      }
      else {
        await Notification.update({user: request.params.currentUser.id}, { read: request.payload.read, notified: request.payload.notified }, { multi: true});
        return reply();
      }
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  }

};
