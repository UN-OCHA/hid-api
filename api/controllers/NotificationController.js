'use strict';

const Controller = require('trails-controller');
const Boom = require('boom');

/**
 * @module NotificationController
 * @description Generated Trails.js Controller.
 */
module.exports = class NotificationController extends Controller{

  find (request, reply) {
    const Notification = this.app.orm.Notification;
    let that = this;

    Notification
      .find({ user: request.params.currentUser.id, read: false})
      .then((results) => {
        reply (results);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  update (request, reply) {
    const Notification = this.app.orm.Notification;
    let that = this;

    Notification
      .findOne({_id: request.params.id})
      .then((record) => {
        if (!record) {
          throw Boom.notFound();
        }
        if (record.user !== request.params.currentUser.id) {
          throw Boom.forbidden();
        }
        record.read = request.payload.read;
        record.save().then(() => {
          return reply(record);
        });
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

};
