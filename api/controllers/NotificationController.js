'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');

/**
 * @module NotificationController
 * @description Generated Trails.js Controller.
 */
module.exports = class NotificationController extends Controller{

  find (request, reply) {
    const Notification = this.app.orm.Notification;
    const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
    const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);

    // Force to display notifications of current user
    criteria.user = request.params.currentUser.id;

    const that = this;
    const query = this.app.services.HelperService.find('Notification', criteria, options);
    query
      .then((results) => {
        return Notification
          .count(criteria)
          .then((number) => {
            return {result: results, number: number};
          });
      })
      .then((result) => {
        return reply(result.result).header('X-Total-Count', result.number);
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, reply);
      });

  }

  update (request, reply) {
    const Notification = this.app.orm.Notification;
    const that = this;

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
          record.save().then(() => {
            return reply(record);
          });
        })
        .catch(err => {
          that.app.services.ErrorService.handle(err, reply);
        });
    }
    else {
      Notification
        .update({user: request.params.currentUser.id}, { read: request.payload.read, notified: request.payload.notified }, { multi: true})
        .then(() => {
          return reply();
        });
    }
  }

};
