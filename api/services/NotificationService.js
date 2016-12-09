'use strict'

const Service = require('trails-service')
const Boom = require('boom')
const _ = require('lodash')

/**
 * @module NotificationService
 * @description Service for notifications
 */
module.exports = class NotificationService extends Service {

  send (notification, callback) {
     const Notification = this.app.orm.Notification
     var that = this

     Notification.create(notification, function (err, not) {
       if (err) {
         that.log.error('Error creating a notification: ' + err)
         return callback(Boom.badImplementation())
       }
       that.app.services.EmailService.sendNotification(notification, function (err, info) {
         if (err) {
           that.log.error('Error sending an email notification: ' + err)
           return callback(Boom.badImplementation())
         }
         return callback(notification)
       });
     })
   }

   sendMultiple(users, notification, callback) {
     // TODO
     for (var i = 0, len = users.length; i < len; i++) {
       if (_.isPlainObject(users[i])) {
         this.send(users[i])
       }
     }
   }

}
