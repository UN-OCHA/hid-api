'use strict';

const async = require('async');
const https = require('https');
const listAttributes = [
  'lists',
  'operations',
  'bundles',
  'disasters',
  'organizations',
  'functional_roles'
];
const hidAccount = '5b2128e754a0d6046d6c69f2';
const OauthToken = require('../models/OauthToken');
const List = require('../models/List');
const User = require('../models/User');
const EmailService = require('../services/EmailService');
const NotificationService = require('../services/NotificationService');
const ErrorService = require('../services/ErrorService');
const ListUserController = require('./ListUserController');
const config = require('../../config/env')[process.env.NODE_ENV];
const logger = config.logger;

/**
 * @module CronController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  deleteExpiredUsers: async function (request, reply) {
    const now = new Date();
    const start = new Date(2016, 0, 1, 0, 0, 0);
    try {
      await User.remove({expires: {$gt: start, $lt: now}});
      reply().code(204);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  deleteExpiredTokens: async function (request, reply) {
    logger.info('Deleting expired Oauth Tokens');
    const now = new Date();
    try {
      await OauthToken.remove({expires: {$lt: now }});
      reply().code(204);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  sendReminderVerifyEmails: async function (request, reply) {
    logger.info('sending reminder emails to verify addresses');
    const cursor = User.find({'email_verified': false}).cursor();

    for (let user = await cursor.next(); user != null; user = await cursor.next()) {
      try {
        if (user.shouldSendReminderVerify()) {
          await EmailService.sendReminderVerify(user);
          await User.collection.update(
            { _id: user._id },
            { $set: {
              remindedVerify: new Date(),
              timesRemindedVerify: user.timesRemindedVerify + 1
            }}
          );
        }
      }
      catch (err) {
        logger.error(err);
      }
    }
    reply().code(204);
  },

  sendReminderUpdateEmails: function (request, reply) {
    logger.info('Sending reminder update emails to contacts');
    const d = new Date(),
      sixMonthsAgo = d.valueOf() - 183 * 24 * 3600 * 1000;

    const stream = User.find({
      'lastModified': { $lt: sixMonthsAgo },
      'authOnly': false
    }).stream();

    stream.on('data', function(user) {
      this.pause();
      const that = this,
        now = new Date();
      if (user.shouldSendReminderUpdate()) {
        EmailService.sendReminderUpdate(user, function (err) {
          if (err) {
            logger.error(err);
            that.resume();
          }
          else {
            User.collection.update(
              { _id: user._id },
              { $set: {
                remindedUpdate: now
              }}
            );
            that.resume();
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
  },

  sendReminderCheckoutEmails: function (request, reply) {
    logger.info('Sending reminder checkout emails to contacts');
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
      logger.info('Checking ' + user.email);
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
  },

  doAutomatedCheckout: function (request, reply) {
    logger.info('Running automated checkouts');
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
  },

  sendReminderCheckinEmails: function (request, reply) {
    logger.info('Sending reminder checkin emails to contacts');

    reply().code(204);

    const stream = User
      .find({'operations.remindedCheckin': false })
      .populate('operations.list')
      .cursor();

    stream.on('data', function(user) {
      this.pause();
      logger.info('Checking ' + user.email);
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
  },

  forcedResetPasswordAlert: function (request, reply) {
    const current = Date.now();
    const fiveMonths = new Date(current - 5 * 30 * 24 * 3600 * 1000);
    const stream = User.find({totp: false, passwordResetAlert30days: false, $or: [{lastPasswordReset: { $lte: fiveMonths }}, {lastPasswordReset: null}]}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      EmailService.sendForcedPasswordResetAlert(user, function () {
        User.collection.update(
          { _id: user._id },
          { $set: {
            passwordResetAlert30days: true
          }}
        );
        sthat.resume();
      });
    });
    stream.on('end', function () {
      reply().code(204);
    });
  },

  forcedResetPasswordAlert7: function (request, reply) {
    const current = Date.now();
    const fiveMonthsAnd23Days = new Date(current - 173 * 24 * 3600 * 1000);
    const stream = User.find({totp: false, passwordResetAlert7days: false, $or: [{lastPasswordReset: { $lte: fiveMonthsAnd23Days }}, {lastPasswordReset: null}]}).cursor();
    stream.on('data', function (user) {
      EmailService.sendForcedPasswordResetAlert7(user, function () {
        User.collection.update(
          { _id: user._id },
          { $set: {
            passwordResetAlert7days: true
          }}
        );
      });
    });
    stream.on('end', function () {
      reply().code(204);
    });
  },

  forceResetPassword: function (request, reply) {
    const current = Date.now();
    const sixMonths = new Date(current - 6 * 30 * 24 * 3600 * 1000);
    const stream = User.find({totp: false, passwordResetAlert: false, $or: [{lastPasswordReset: { $lte: sixMonths }}, {lastPasswordReset: null}]}).cursor();
    stream.on('data', function (user) {
      EmailService.sendForcedPasswordReset(user, function () {
        User.collection.update(
          { _id: user._id },
          { $set: {
            passwordResetAlert: true
          }}
        );
      });
    });
    stream.on('end', function () {
      reply().code(204);
    });
  },

  sendSpecialPasswordResetEmail: function (request, reply) {
    reply().code(204);
    const stream = User.find({deleted: false}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      EmailService.sendSpecialPasswordReset(user, function () {
        sthat.resume();
      });
    });
  },

  setListCounts: function (request, reply) {
    reply().code(204);
    const stream = List.find({deleted: false}).cursor();
    stream.on('data', function (list) {
      const sthat = this;
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
  },

  /*adjustEmailVerified (request, reply) {
    const app = this.app;
    const stream = User.find({'email_verified': false}).cursor();

    stream.on('data', function(user) {
      const sthat = this;
      this.pause();
      let index = user.emailIndex(user.email);
      if (index !== -1 && user.emails[index].validated === true) {
        user.email_verified = true;
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

  adjustEmailDuplicates (request, reply) {
    const app = this.app;
    const stream = User.find({}).cursor();

    stream.on('data', function(user) {
      const sthat = this;
      this.pause();
      let count = 0, ids = [];
      user.emails.forEach(function (email) {
        if (email.email === user.email) {
          count++;
          if (count > 1 && email.validated === false) {
            ids.push(email._id);
          }
        }
      });
      if (ids.length) {
        ids.forEach(function (id) {
          user.emails.id(id).remove();
        });
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
  }*/

  verifyAutomatically: function (request, reply) {
    logger.info('automatically verify users');
    const that = this;
    const stream = User.find({}).cursor();

    stream.on('data', function(user) {
      let promises = [];
      user.emails.forEach(function (email) {
        if (email.validated) {
          promises.push(user.isVerifiableEmail(email.email));
        }
      });
      Promise.all(promises)
        .then(domains => {
          domains.forEach(function (domain) {
            if (domain) {
              user.verified = true;
              user.verified_by = hidAccount;
              if (!user.verified) {
                user.verifiedOn = new Date();
              }
              // If the domain is associated to a list, check user in this list automatically
              if (domain.list) {
                if (!user.organizations) {
                  user.organizations = [];
                }

                let isCheckedIn = false;
                // Make sure user is not already checked in this list
                for (let i = 0, len = user.organizations.length; i < len; i++) {
                  if (user.organizations[i].list.equals(domain.list._id) &&
                    user.organizations[i].deleted === false) {
                    isCheckedIn = true;
                  }
                }

                if (!isCheckedIn) {
                  ListUserController
                    ._checkinHelper(domain.list, user, true, 'organizations', user)
                    .catch(err => {
                      that.app.log.error(err);
                    });
                }
              }
            }
          });
        });
    });

    stream.on('end', function () {
      reply().code(204);
    });
  },

  verificationExpiryEmail: function (request, reply) {
    const current = Date.now();
    const oneYear = new Date(current - 358 * 24 * 3600 * 1000);
    const stream = User.find({verified: true, verifiedOn: { $lte: oneYear }}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      EmailService.sendVerificationExpiryEmail(user, function () {
        User.collection.update(
          { _id: user._id },
          { $set: {
            verificationExpiryEmail: true
          }}
        );
        sthat.resume();
      });
    });
    stream.on('end', function () {
      reply().code(204);
    });
  },

  unverifyAfterOneYear: function (request, reply) {
    const current = Date.now();
    const oneYear = new Date(current - 365 * 24 * 3600 * 1000);
    const stream = User.find({verified: true, verifiedOn: { $lte: oneYear }, verificationExpiryEmail: true}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      User.collection.update(
        { _id: user._id },
        { $set: {
          verified: false,
          verifiedOn: new Date(0, 0, 1, 0, 0, 0),
          verified_by: null
        }}
      );
      sthat.resume();
    });
    stream.on('end', function () {
      reply().code(204);
    });
  },

  verifyEmails: function (request, reply) {
    const stream = User.find({email_verified: false}).cursor();
    stream.on('data', function (user) {
      const sthat = this;
      this.pause();
      https.get('https://app.verify-email.org/api/v1/' + process.env.VERIFY_EMAILS_KEY + '/verify/' + user.email, (res) => {
        let body = '';
        res.on('data', function (d) {
          body += d;
        });
        res.on('end', function() {
          let parsed = {};
          try {
            parsed = JSON.parse(body);
            if (parsed.status === 1) {
              user.verifyEmail(user.email);
              user.save(function (err) {
                sthat.resume();
              });
            }
            else {
              sthat.resume();
            }
          }
          catch (err) {
            sthat.resume();
          }
        });
      });
    });
  },

  setAcronymsOrNames: function (request, reply) {
    reply().code(204);
    const stream = User.find({}).cursor();
    stream.on('data', function (user) {
      if (user.organization) {
        user.organization.acronymsOrNames = {};
        user.organization.names.forEach(function (name) {
          user.organization.acronymsOrNames[name.language] = name.text;
        });
        user.organization.acronyms.forEach(function (acronym) {
          if (acronym.text !== '') {
            user.organization.acronymsOrNames[acronym.language] = acronym.text;
          }
        });
        user.save();
      }
    });
  }

};
