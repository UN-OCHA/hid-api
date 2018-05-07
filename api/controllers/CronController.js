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

/**
 * @module CronController
 * @description Generated Trails.js Controller.
 */
module.exports = class CronController extends Controller {

  // Notify users of a new disaster
  _notifyNewDisaster (disaster) {
    const app = this.app;
    const List = app.orm.list;
    const User = app.orm.User;
    const NotificationService = app.services.NotificationService;
    if (disaster.metadata.operation && disaster.metadata.operation.length) {
      let operation = {};
      for (let i = 0, len = disaster.metadata.operation.length; i < len; i++) {
        operation = disaster.metadata.operation[i];
        List
          .findOne({remote_id: operation.id})
          .then((list) => {
            if (!list) {
              throw new Error('List not found');
            }
            return User
              .find({operations: { $elemMatch: { list: list._id, deleted: false }} });
          })
          .then((users) => {
            const notification = {type: 'new_disaster', params: {list: disaster}};
            app.log.debug('Notifying ' + users.length + ' users of a new disaster: ' + disaster.label);
            NotificationService.sendMultiple(users, notification, () => { });
          })
          .catch((err) => {});
      }
    }
  }

  _createListHelper (list, cb) {
    const List = this.app.orm.List;
    const app = this.app;
    const that = this;
    List.create(list, function (err, li) {
      if (err) {
        app.log.error(err);
        return cb(err);
      }
      if (li.type === 'disaster') {
        that._notifyNewDisaster(li);
      }
      cb();
    });
  }

  // Create a list based on the item pulled from hrinfo
  _createList (listType, language, item, cb) {
    const List = this.app.orm.List;
    const User = this.app.orm.User;
    const that = this;
    const inactiveOps = [2782,2785,2791,38230];
    if ((listType === 'operation' &&
      item.status !== 'inactive' &&
      inactiveOps.indexOf(item.id) === -1 &&
      item.hid_access !== 'inactive') ||
      (listType === 'bundle' &&
      item.hid_access !== 'no_list') ||
      (listType !== 'operation' &&
      listType !== 'bundle')) {
      List.findOne({type: listType, remote_id: item.id}, function (err, list) {

        if (!list) {
          that._parseList(listType, language, item, function (newList) {
            that._parseListLanguage(newList, newList.label, newList.acronym, language);
            that._createListHelper(newList, cb);
          });
        }
        else {
          that._parseList(listType, language, item, function (newList) {
            let updateUsers = false;
            if (newList.name !== list.name || newList.visibility !== list.visibility) {
              updateUsers = true;
            }
            // Do not change list visibility or joinability if the list is already there
            delete newList.visibility;
            delete newList.joinability;
            that._parseListLanguage(list, newList.label, newList.acronym, language);
            if (language !== 'en') {
              delete newList.label;
              delete newList.acronym;
            }
            _.merge(list, newList);
            if (list.deleted) {
              list.deleted = false;
            }
            list.save().then(function (list) {
              if (updateUsers) {
                const criteria = {};
                criteria[list.type + 's.list'] = list._id.toString();
                User
                  .find(criteria)
                  .then(users => {
                    let user = {};
                    for (let i = 0; i < users.length; i++) {
                      user = users[i];
                      for (let j = 0; j < user[list.type + 's'].length; j++) {
                        if (user[list.type + 's'][j].list.toString() === list._id.toString()) {
                          user[list.type + 's'][j].name = list.name;
                          user[list.type + 's'][j].names = list.names;
                          user[list.type + 's'][j].acronym = list.acronym;
                          user[list.type + 's'][j].acronyms = list.acronyms;
                          user[list.type + 's'][j].owner = list.owner;
                          user[list.type + 's'][j].managers = list.managers;
                          user[list.type + 's'][j].visibility = list.visibility;
                        }
                      }
                      if (list.type === 'organization' &&
                        user.organization &&
                        user.organization.list &&
                        user.organization.list.toString() === list._id.toString()) {
                        user.organization.name = list.name;
                        user.organization.names = list.names;
                        user.organization.acronym = list.acronym;
                        user.organization.acronyms = list.acronyms;
                        user.organization.owner = list.owner;
                        user.organization.managers = list.managers;
                        user.organization.visibility = list.visibility;
                      }
                      user.save();
                    }
                    cb();
                  });
              }
              else {
                cb();
              }
            });
          });
        }
      });
    }
    else {
      cb();
    }
  }

  _parseList (listType, language, item, cb) {
    const List = this.app.orm.List;
    let visibility = '', label = '', acronym = '', tmpList = {};
    visibility = 'all';
    if (item.hid_access && item.hid_access === 'closed') {
      visibility = 'verified';
    }
    label = item.label;
    if (listType === 'bundle' || listType === 'office') {
      if (item.operation[0].label) {
        label = item.operation[0].label + ': ' + item.label;
      }
      else {
        label = 'Global: ' + item.label;
      }
    }
    if (listType === 'organization' && item.acronym) {
      acronym = item.acronym;
    }
    tmpList = {
      label: label,
      acronym: acronym,
      type: listType,
      visibility: visibility,
      joinability: 'public',
      remote_id: item.id,
      metadata: item
    };

    if (listType === 'bundle') {
      List
        .findOne({type: 'operation', remote_id: item.operation[0].id})
        .then((op) => {
          if (op) {
            if (op.metadata.hid_access) {
              if (op.metadata.hid_access === 'open') {
                tmpList.visibility = 'all';
              }
              else if (op.metadata.hid_access === 'closed') {
                tmpList.visibility = 'verified';
              }
            }
          }
          cb(tmpList);
        });
    }
    else {
      cb(tmpList);
    }
  }

  _parseListLanguage (list, label, acronym, language) {
    let labelFound = false;
    if (list.labels && list.labels.length) {
      for (let i = 0; i < list.labels.length; i++) {
        if (list.labels[i].language === language) {
          labelFound = true;
          list.labels[i].text = label;
        }
      }
    }
    else {
      list.labels = [];
    }
    if (!labelFound) {
      list.labels.push({language: language, text: label});
    }

    let acronymFound = false;
    if (list.acronyms && list.acronyms.length) {
      for (let j = 0; j < list.acronyms.length; j++) {
        if (list.acronyms[j].language === language) {
          acronymFound = true;
          list.acronyms[j].text = acronym;
        }
      }
    }
    else {
      list.acronyms = [];
    }
    if (!acronymFound) {
      list.acronyms.push({language: language, text: acronym});
    }
  }

  importLists (request, reply) {
    const app = this.app;
    const now = Math.floor(Date.now() / 1000);
    const languages = ['en', 'fr', 'es'];
    const that = this;
    //const Cache = app.services.CacheService.getCaches(['local-cache'])
    let hasNextPage = false, pageNumber = 1, path = '';

    reply().code(204);

    let lastPull = Math.round(Date.now() / 1000) - 7 * 24 * 3600;
    //Cache.then((mongoCache) => {
    //return mongoCache.get('lastPull', function (err, lastPull) {
    //if (err) app.log.info(err)
    if (!lastPull) {
      lastPull = 0;
    }
    async.eachSeries(languages, function (language, nextLanguage) {
      // For each list type
      async.eachSeries(listTypes,
        function(listType, nextType) {
          // Parse while there are pages
          async.doWhilst(function (nextPage) {
            path = '/' + language + '/api/v1.0/' + listType + 's?page=' + pageNumber + '&filter[created][value]=' + lastPull + '&filter[created][operator]=>';
            if (listType === 'organization' || listType === 'functional_role') {
              path = '/' + language + '/api/v1.0/' + listType + 's?page=' + pageNumber;
            }
            https.get({
              host: 'www.humanitarianresponse.info',
              port: 443,
              path: path
            }, function (response) {
              pageNumber++;
              let body = '';
              response.on('data', function (d) {
                body += d;
              });
              response.on('end', function() {
                let parsed = {};
                try {
                  parsed = JSON.parse(body);
                  hasNextPage = parsed.next ? true : false;
                  async.eachSeries(parsed.data, function (item, cb) {
                    // Do not add disasters more than 2 years old
                    if (listType !== 'disaster' || (listType === 'disaster' && now - item.created < 2 * 365 * 24 * 3600)) {
                      that._createList(listType, language, item, cb);
                    }
                    else {
                      cb();
                    }
                  }, function (err) {
                    setTimeout(function() {
                      app.log.info('Done loading page ' + pageNumber + ' for ' + listType);
                      nextPage();
                    }, 1000);
                  });
                }
                catch (e) {
                  app.log.error('Error parsing hrinfo API.', { error: e });
                }
              });
            });
          }, function () {
            return hasNextPage;
          }, function (err, results) {
            pageNumber = 1;
            app.log.info('Done processing all ' + listType + 's');
            nextType();
          });
        }, function (err) {
          const currentTime = Math.round(Date.now() / 1000);
          // Keep item in cache 12 minutes (720 seconds)
          /*mongoCache.set('lastPull', currentTime, {ttl: 720}, function (err) {
            app.log.info(err);
          });*/
          app.log.info('Done processing all list types for ' + language + ' at ' + currentTime);
          nextLanguage();
        }
      );
    }, function (err) {
      app.log.info('Done importing lists');
    });
    //});
    //});
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

  setListCounts (request, reply) {
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
  }

};
