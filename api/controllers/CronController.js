'use strict';

const Controller = require('trails/controller');
const async = require('async');
const _ = require('lodash');
const https = require('https');
const listAttributes = [
  'lists',
  'operations',
  'bundles',
  'disasters',
  'organizations',
  'functional_roles'
];
const listTypes = [
  'operation',
  'bundle',
  'disaster',
  'organization',
  'functional_role',
  'office'
];
const hidAccount = '5b2128e754a0d6046d6c69f2';

/**
 * @module CronController
 * @description Generated Trails.js Controller.
 */
module.exports = class CronController extends Controller {

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
    const User = this.app.orm.User;
    const EmailService = this.app.services.EmailService;
    const app = this.app;
    this.app.log.info('sending reminder emails to verify addresses');
    const stream = User.find({'email_verified': false}).cursor();

    stream.on('data', function(user) {
      const sthat = this;
      this.pause();
      if (user.shouldSendReminderVerify()) {

        const now = Date.now();
        EmailService.sendReminderVerify(user, function (err) {
          if (err) {
            app.log.error(err);
            sthat.resume();
          }
          else {
            user.remindedVerify = now.valueOf();
            user.timesRemindedVerify = user.timesRemindedVerify + 1;
            user.save(function (err) {
              sthat.resume();
            });
          }
        });
      }
      else {
        this.resume();
      }
    });

    stream.on('end', function () {
      reply().code(204);
    });
  }

  sendReminderUpdateEmails (request, reply) {
    const app = this.app;
    app.log.info('Sending reminder update emails to contacts');
    const d = new Date(),
      sixMonthsAgo = d.valueOf() - 183 * 24 * 3600 * 1000,
      User = app.orm.User,
      EmailService = app.services.EmailService;

    const stream = User.find({
      'updatedAt': { $lt: sixMonthsAgo },
      'authOnly': false
    }).stream();

    stream.on('data', function(user) {
      this.pause();
      const that = this,
        now = new Date();
      if (user.shouldSendReminderUpdate()) {
        EmailService.sendReminderUpdate(user, function (err) {
          if (err) {
            app.log.error(err);
            that.resume();
          }
          else {
            user.remindedUpdate = now;
            user.save(function (err) {
              that.resume();
            });
          }
        });
      }
      else {
        this.resume();
      }
    });

    stream.on('end', function () {
      reply().code(204);
    });
  }

  sendReminderCheckoutEmails (request, reply) {
    const app = this.app;
    app.log.info('Sending reminder checkout emails to contacts');
    const User = app.orm.User,
      NotificationService = app.services.NotificationService;
    let populate = '';
    const criteria = {};
    criteria.email_verified = true;
    criteria.$or = [];
    listAttributes.forEach(function (attr) {
      const tmp = {};
      tmp[attr + '.remindedCheckout'] = false;
      criteria.$or.push(tmp);
      populate += ' ' + attr + '.list';
    });

    reply().code(204);

    const stream = User
      .find(criteria)
      .populate(populate)
      .cursor();

    stream.on('data', function(user) {
      this.pause();
      app.log.info('Checking ' + user.email);
      const that = this;
      const now = Date.now();
      async.eachSeries(listAttributes, function (attr, nextAttr) {
        async.eachSeries(user[attr], function (lu, nextLu) {
          if (lu.checkoutDate && lu.remindedCheckout === false && !lu.deleted) {
            const dep = new Date(lu.checkoutDate);
            if (now.valueOf() - dep.valueOf() > 48 * 3600 * 1000) {
              const notification = {type: 'reminder_checkout', user: user, params: {listUser: lu, list: lu.list}};
              NotificationService.send(notification, () => {
                lu.remindedCheckout = true;
                user.save(function (err) {
                  nextLu();
                });
              });
            }
            else {
              nextLu();
            }
          }
          else {
            nextLu();
          }
        }, function (err) {
          nextAttr();
        });
      }, function (err) {
        that.resume();
      });
    });
  }

  doAutomatedCheckout (request, reply) {
    const app = this.app;
    app.log.info('Running automated checkouts');
    const User = app.orm.User,
      NotificationService = app.services.NotificationService;

    let populate = '';
    const criteria = {};
    criteria.email_verified = true;
    criteria.$or = [];
    listAttributes.forEach(function (attr) {
      const tmp = {};
      tmp[attr + '.remindedCheckout'] = true;
      criteria.$or.push(tmp);
      populate += ' ' + attr + '.list';
    });

    const stream = User
      .find(criteria)
      .populate(populate)
      .cursor();

    stream.on('data', function(user) {
      this.pause();
      const that = this;
      const now = Date.now();
      async.eachSeries(listAttributes, function (attr, nextAttr) {
        async.eachSeries(user[attr], function (lu, nextLu) {
          if (lu.checkoutDate && lu.remindedCheckout === true && !lu.deleted) {
            const dep = new Date(lu.checkoutDate);
            if (now.valueOf() - dep.valueOf() > 14 * 24 * 3600 * 1000) {
              const notification = {type: 'automated_checkout', user: user, params: {listUser: lu, list: lu.list}};
              NotificationService.send(notification, () => {
                lu.deleted = true;
                user.save(function (err) {
                  nextLu();
                });
              });
            }
            else {
              nextLu();
            }
          }
          else {
            nextLu();
          }
        }, function (err) {
          nextAttr();
        });
      }, function (err) {
        that.resume();
      });
    });
    stream.on('end', function () {
      reply().code(204);
    });
  }

  sendReminderCheckinEmails (request, reply) {
    const app = this.app;
    app.log.info('Sending reminder checkin emails to contacts');
    const User = app.orm.User,
      NotificationService = app.services.NotificationService;

    reply().code(204);

    const stream = User
      .find({'operations.remindedCheckin': false })
      .populate('operations.list')
      .cursor();

    stream.on('data', function(user) {
      this.pause();
      app.log.info('Checking ' + user.email);
      const that = this;
      async.eachSeries(user.operations, function (lu, nextLu) {
        const d = new Date(),
          offset = d.valueOf() - lu.valueOf();

        if (!lu.remindedCheckin && offset > 48 * 3600 * 1000 && offset < 72 * 3600 * 1000 && !lu.deleted) {
          const hasLocalPhoneNumber = user.hasLocalPhoneNumber(lu.list.metadata.country.pcode);
          user.isInCountry(lu.list.metadata.country.pcode, function (err, inCountry) {
            const notification = {
              type: 'reminder_checkin',
              user: user,
              params: {listUser: lu, list: lu.list, hasLocalPhoneNumber: hasLocalPhoneNumber, inCountry: inCountry}
            };
            NotificationService.send(notification, () => {
              lu.remindedCheckin = true;
              user.save(function (err) {
                nextLu();
              });
            });
          });
        }
        else {
          nextLu();
        }
      }, function (err) {
        that.resume();
      });
    });
  }

  forcedResetPasswordAlert (request, reply) {
    const User = this.app.orm.user;
    const EmailService = this.app.services.EmailService;
    const current = Date.now();
    const fiveMonths = new Date(current - 5 * 30 * 24 * 3600 * 1000);
    const stream = User.find({totp: false, passwordResetAlert30days: false, $or: [{lastPasswordReset: { $lte: fiveMonths }}, {lastPasswordReset: null}]}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      EmailService.sendForcedPasswordResetAlert(user, function () {
        user.passwordResetAlert30days = true;
        user.save();
        sthat.resume();
      });
    });
    stream.on('end', function () {
      reply().code(204);
    });
  }

  forcedResetPasswordAlert7 (request, reply) {
    const User = this.app.orm.user;
    const EmailService = this.app.services.EmailService;
    const current = Date.now();
    const fiveMonthsAnd23Days = new Date(current - 173 * 24 * 3600 * 1000);
    const stream = User.find({totp: false, passwordResetAlert7days: false, $or: [{lastPasswordReset: { $lte: fiveMonthsAnd23Days }}, {lastPasswordReset: null}]}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      EmailService.sendForcedPasswordResetAlert7(user, function () {
        user.passwordResetAlert7days = true;
        user.save();
        sthat.resume();
      });
    });
    stream.on('end', function () {
      reply().code(204);
    });
  }

  forceResetPassword (request, reply) {
    const User = this.app.orm.user;
    const EmailService = this.app.services.EmailService;
    const current = Date.now();
    const sixMonths = new Date(current - 6 * 30 * 24 * 3600 * 1000);
    const stream = User.find({totp: false, passwordResetAlert: false, $or: [{lastPasswordReset: { $lte: sixMonths }}, {lastPasswordReset: null}]}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      EmailService.sendForcedPasswordReset(user, function () {
        user.passwordResetAlert = true;
        user.save();
        sthat.resume();
      });
    });
    stream.on('end', function () {
      reply().code(204);
    });
  }

  sendSpecialPasswordResetEmail (request, reply) {
    reply().code(204);
    const User = this.app.orm.user;
    const EmailService = this.app.services.EmailService;
    const stream = User.find({deleted: false}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      EmailService.sendSpecialPasswordReset(user, function () {
        sthat.resume();
      });
    });
  }

  /*setListCounts (request, reply) {
    reply().code(204);
    const List = this.app.orm.list;
    const User = this.app.orm.User;
    const stream = List.find({deleted: false}).cursor();
    stream.on('data', function (list) {
      const sthat = this;
      const listType = list.type;
      this.pause();
      let criteria = { };
      criteria[list.type + 's'] = {$elemMatch: {list: list._id, deleted: false}};
      User
        .count(criteria)
        .then(number => {
          list.count = number;
          return list.save();
        })
        .then(() => {
          sthat.resume();
        })
        .catch(err => {
          sthat.resume();
        });
    });
  }*/

  verifyAutomatically (request, reply) {
    const User = this.app.orm.User;
    const app = this.app;
    this.app.log.info('automatically verify users');
    const stream = User.find({'verified': false}).cursor();

    stream.on('data', function(user) {
      const sthat = this;
      this.pause();
      if (user.canBeVerifiedAutomatically()) {
        // Verify user
        user.verified = true;
        user.verified_by = hidAccount;
        user.verifiedOn = new Date();
        user.save(function (err) {
          sthat.resume();
        });
      }
      else {
        this.resume();
      }
    });

    stream.on('end', function () {
      reply().code(204);
    });
  }

};
