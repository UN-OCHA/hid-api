'use strict';

const Boom = require('boom');
const async = require('async');
const Notification = require('../models/Notification');
const User = require('../models/User');
const EmailService = require('./EmailService');

/**
 * @module NotificationService
 * @description Service for notifications
 */

module.exports = {

  // Create notification and send email
  send: async function (notification) {
    await Notification.create(notification);
    return EmailService.sendNotification(notification);
  },

  // Create notification and send email to multiple users
  sendMultiple: function (users, notification, callback) {
    // Note that async functions return a promise
    const promises = users.map(async (user) => {
      const cNotification = JSON.parse(JSON.stringify(notification));
      cNotification.user = user;
      const result = await Notification.create(cNotification);
      await EmailService.sendNotification(cNotification);
      return result;
    });
    return Promise.all(promises);
  },

  // Create only a notification, without sending an email
  notify: function (notification) {
    return Notification.create(notification);
  },

  notifyMultiple: function (users, notification) {
    // Note that async functions return a promise
    const promises = users.map(async (user) => {
      const cNotification = JSON.parse(JSON.stringify(notification));
      cNotification.user = user;
      const result = await Notification.create(cNotification);
      return result;
    });
    return Promise.all(promises);
  }

};
