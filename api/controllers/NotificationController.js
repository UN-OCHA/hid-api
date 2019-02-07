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

  find: function (request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    // Force to display notifications of current user
    criteria.user = request.params.currentUser.id;

    const query = HelperService.find(Notification, criteria, options);
    let gresults = {};
    query
      .then((results) => {
        gresults = results;
        return Notification.count(criteria);
      })
      .then((number) => {
        return reply(gresults).header('X-Total-Count', number);
      })
      .catch((err) => {
        ErrorService.handle(err, request, reply);
      });

  },

  update: function (request, reply) {

    if (!request.payload || !request.payload.hasOwnProperty('read') || !request.payload.hasOwnProperty('notified')) {
      return reply(Boom.badRequest());
    }

    if (request.params.id) {
      Notification
        .findOne({_id: request.params.id})
        .then((record) => {
          if (!record) {
            throw Boom.notFound();
          }
          if (record.user.toString() !== request.params.currentUser.id) {
            throw Boom.forbidden();
          }
          record.notified = request.payload.notified;
          record.read = request.payload.read;
          return record.save();
        })
        .then(record => {
          return reply(record);
        })
        .catch(err => {
          ErrorService.handle(err, request, reply);
        });
    }
    else {
      Notification
        .update({user: request.params.currentUser.id}, { read: request.payload.read, notified: request.payload.notified }, { multi: true})
        .then(() => {
          return reply();
        })
        .catch(err => {
          ErrorService.handle(err, request, reply);
        });
    }
  }

};
