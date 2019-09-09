

const Boom = require('boom');
const Notification = require('../models/Notification');
const HelperService = require('../services/HelperService');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module NotificationController
 * @description Find and update notifications created by the system.
 */
module.exports = {

  async find(request, reply) {
    const options = HelperService.getOptionsFromQuery(request.query);
    const criteria = HelperService.getCriteriaFromQuery(request.query);

    // Force to display notifications of current user
    criteria.user = request.auth.credentials.id;

    const [results, number] = await Promise.all([
      HelperService.find(Notification, criteria, options),
      Notification.countDocuments(criteria),
    ]);
    return reply.response(results).header('X-Total-Count', number);
  },

  async update(request, reply) {
    if (!request.payload
      || !Object.prototype.hasOwnProperty.call(request.payload, 'read')
      || !Object.prototype.hasOwnProperty.call(request.payload, 'notified')) {
      logger.warn(
        '[NotificationController->update] Bad request',
        { request: request.payload },
      );
      throw Boom.badRequest();
    }

    if (request.params.id) {
      let record = await Notification.findOne({ _id: request.params.id });
      if (!record) {
        logger.warn(
          `[NotificationController->update] Notification ${request.params.id} not found`,
        );
        throw Boom.notFound();
      }
      if (record.user.toString() !== request.auth.credentials.id) {
        logger.warn(
          '[NotificationController->update] User is not allowed to update notifications',
          { currentUser: request.auth.credentials.id, user: record.user.toString() },
        );
        throw Boom.forbidden();
      }
      record.notified = request.payload.notified;
      record.read = request.payload.read;
      record = await record.save();
      logger.info(
        `[NotificationController->update] Saved notification ${request.params.id}`,
      );
      return record;
    }
    await Notification.update({ user: request.auth.credentials.id },
      { read: request.payload.read, notified: request.payload.notified },
      { multi: true });
    logger.info(
      '[NotificationController->update] Updated notifications for current user',
      { currentUser: request.auth.credentials.id, request: request.payload },
    );
    return reply.response().code(204);
  },

};
