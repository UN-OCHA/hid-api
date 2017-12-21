'use strict';

const Controller = require('trails/controller');

/**
 * @module CronController
 * @description Generated Trails.js Controller.
 */
module.exports = class CronController extends Controller{

  synchronizeGoogleSpreadsheets (request, reply) {
    this.app.log.info('Synchronizing google spreadsheets');
    const GSSSync = this.app.orm.GSSSync;
    const that = this;

    const stream = GSSSync
      .find({})
      .cursor();

    stream.on('data', function(gsssync) {
      this.pause();
      const sthat = this;
      that.app.controllers.GSSSyncController._syncSpreadsheet(gsssync)
        .then(resp => {
          sthat.resume();
        })
        .catch(err => {
          sthat.resume();
        });
    });

    stream.on('end', function () {
      reply().code(204);
    });
  }

  importLists (request, reply) {
    reply().code(204);
    this.app.config.cron.importLists(this.app);
  }

  deleteExpiredUsers (request, reply) {
    const User = this.app.orm.user;
    const that = this;
    const now = new Date();
    const start = new Date(2016, 0, 1, 0, 0, 0);
    User
      .remove({expires: {$gt: start, $lt: now}})
      .then(() => {
        reply().code(204);
      })
      .catch (err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  deleteExpiredTokens (request, reply) {
    this.app.log.info('Deleting expired Oauth Tokens');
    const OauthToken = this.app.orm.OauthToken;
    const that = this;
    const now = new Date();
    OauthToken
      .remove({expires: {$lt: now }})
      .then(() => {
        reply().code(204);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  sendReminderVerifyEmails (request, reply) {
    reply().code(204);
    this.app.config.cron.sendReminderVerifyEmails(this.app);
  }

  sendReminderUpdateEmails (request, reply) {
    reply().code(204);
    this.app.config.cron.sendReminderUpdateEmails(this.app);
  }

  sendReminderCheckoutEmails (request, reply) {
    reply().code(204);
    this.app.config.cron.sendReminderCheckoutEmails(this.app);
  }

  sendReminderCheckinEmails (request, reply) {
    reply().code(204);
    this.app.config.cron.sendReminderCheckinEmails(this.app);
  }

  forcedResetPasswordAlert (request, reply) {
    reply().code(204);
    this.app.config.cron.forcedResetPasswordAlert(this.app);
  }

  forceResetPassword (request, reply) {
    reply().code(204);
    this.app.config.cron.forceResetPassword(this.app);
  }

};
