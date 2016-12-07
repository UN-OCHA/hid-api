'use strict'

const Service = require('trails-service')
const Boom = require('boom')

/**
 * @module NotificationService
 * @description Service for notifications
 */
module.exports = class NotificationService extends Service {

  send (notification, callback) {
     const Notification = this.app.orm.Notification
     var that = this

     Notification.create(notification, function (err, not) {
       if (err) return callback(Boom.badImplementation())
       that.app.services.EmailService.sendNotification(notification, function (err, info) {
         if (err) return callback(Boom.badImplementation())
         return callback(notification)
       });
     })
   }

}

