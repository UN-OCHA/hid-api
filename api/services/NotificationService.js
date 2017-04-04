'use strict';

const Service = require('trails/service');
const Boom = require('boom');
const async = require('async');

/**
 * @module NotificationService
 * @description Service for notifications
 */
module.exports = class NotificationService extends Service {

  // Create notification and send email
  send (notification, callback) {
    const Notification = this.app.orm.Notification;
    const that = this;

    this.log.debug('Sending a notification of type ' +
      notification.type + ' to user ' + notification.user.email);

    Notification.create(notification, function (err, not) {
      if (err) {
        that.log.error('Error creating a notification: ' + err);
        return callback(Boom.badImplementation());
      }
      that.app.services.EmailService.sendNotification(notification, function (err, info) {
        if (err) {
          that.log.error('Error sending an email notification: ' + err);
          return callback(Boom.badImplementation());
        }
        return callback();
      });
    });
  }

  // Create notification and send email to multiple users
  sendMultiple(users, notification, callback) {
    const that = this;
    this._transformUsers(users, function (items) {
      that._sendMultipleHelper(items, notification, callback);
    });
  }

  // Transform user IDs in users if needed
  _transformUsers (users, callback) {
    const User = this.app.orm.User;
    let areUsers = true;
    for (let i = 0, len = users.length; i < len; i++) {
      if (users[i].constructor.name === 'ObjectID') {
        areUsers = false;
      }
    }
    if (!areUsers) {
      this.log.debug('Transforming user ID in users');
      User
        .find({_id: { $in: users}})
        .then((items) => {
          callback(items);
        });
    }
    else {
      callback(users);
    }
  }

  // Helper function to send multiple emails and notifications
  _sendMultipleHelper(users, notification, callback) {
    const that = this;
    async.each(users, function (user, next) {
      notification.user = user;
      that.send(notification, next);
    }, callback);
  }

  // Create only a notification, without sending an email
  notify(notification, callback) {
    const Notification = this.app.orm.Notification;
    const that = this;

    this.log.debug('Sending a notification of type ' +
      notification.type + ' to user ' + notification.user.email);

    Notification.create(notification, function (err, not) {
      if (err) {
        that.log.error('Error creating a notification: ' + err);
        return callback(Boom.badImplementation());
      }
      return callback();
    });
  }

  notifyMultiple (users, notification, callback) {
    const that = this;
    this._transformUsers(users, function (items) {
      async.each(items, function(user, next) {
        notification.user = user;
        that.notify(notification, next);
      }, callback);
    });
  }

};
