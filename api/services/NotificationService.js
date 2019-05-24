
const lodash = require('lodash');
const Notification = require('../models/Notification');
const EmailService = require('./EmailService');

/**
 * @module NotificationService
 * @description Service for notifications
 */

module.exports = {

  // Create notification and send email
  async send(notification) {
    await Notification.create(notification);
    return EmailService.sendNotification(notification);
  },

  // Create notification and send email to multiple users
  sendMultiple(users, notification) {
    // Note that async functions return a promise
    const promises = users.map(async (user) => {
      const cNotification = lodash.cloneDeep(notification);
      cNotification.user = user;
      const result = await Notification.create(cNotification);
      await EmailService.sendNotification(cNotification);
      return result;
    });
    return Promise.all(promises);
  },

  // Create only a notification, without sending an email
  notify(notification) {
    return Notification.create(notification);
  },

  notifyMultiple(users, notification) {
    // Note that async functions return a promise
    const promises = users.map(async (user) => {
      const cNotification = lodash.cloneDeep(notification);
      cNotification.user = user;
      const result = await Notification.create(cNotification);
      return result;
    });
    return Promise.all(promises);
  },

};
