// config/cron.js
const https = require('https');
const async = require('async');

module.exports = {
  jobs: {
    // Delete expired users
    deleteExpiredUsers: {
      schedule: '*/60 * * * *',
      onTick: deleteExpiredUsers,
      start: true
    },
    // Delete expired oauth tokens
    deleteExpiredTokens: {
      schedule: '*/10 * * * *',
      onTick: deleteExpiredTokens,
      start: true
    },
    // Import lists from Humanitarianresponse
    importLists: {
      schedule: '*/60 * * * *', // Run every 10 minutes
      onTick: importLists,
      start: true
    },
    // Remind users to verify their email
    sendReminderVerifyEmails: {
      schedule: '*/60 * * * *',
      onTick: sendReminderVerifyEmails,
      start: true
    },
    // Send a reminder to people who haven't updated their profile in the last 6 months
    sendReminderUpdateEmails: {
      schedule: '*/60 * * * *',
      onTick: sendReminderUpdateEmails,
      start: true
    },
    // Send a reminder to checkout to people who are 2 days past their checkout date
    sendReminderCheckoutEmails: {
      schedule: '*/60 * * * *',
      onTick: sendReminderCheckoutEmails,
      start: true
    }
  }
};

var deleteExpiredUsers = function (app) {
  const User = app.orm.user;
  var now = Date.now();
  var start = new Date(2016, 0, 1, 0, 0, 0);
  User.remove({expires: {$gt: start, $lt: now}});
};

var deleteExpiredTokens = function (app) {
  const OauthToken = app.orm.OauthToken;
  var now = Date.now();
  OauthToken.remove({expires: {$lt: now }});
};

var importLists = function (app) {
  const List = app.orm.list;
  const User = app.orm.user;
  const NotificationService = app.services.NotificationService;
  const listTypes = ['operation', 'bundle', 'disaster', 'organization'];
  const now = Math.floor(Date.now() / 1000);
  //const Cache = app.services.CacheService.getCaches(['local-cache'])
  var hasNextPage = false, pageNumber = 1, path = '';

  // Notify users of a new disaster
  var _notifyNewDisaster = function (list) {
    var operation = {};
    for (var i = 0, len = list.metadata.operation.length; i < len; i++) {
      operation = list.metadata.operation[i];
      List
        .findOne({remote_id: operation.id})
        .then((list) => {
          if (!list) {
            throw new Error('List not found');
          }
          return User
            .find({'operations.list': list._id})
            .then((users) => {
              return {list: list, users: users};
            });
        })
        .then((results) => {
          const list = results.list, users = results.users;
          notification = {type: 'new_disaster', params: {list: list}};
          NotificationService.sendMultiple(users, notification, () => { });
        })
        .catch((err) => {});
    }
  };

  // Create a list based on the item pulled from hrinfo
  var _createList = function (listType, item, cb) {
    var tmpList = {}, visibility = '', label = '', acronym = '';
    if ((listType === 'operation' && item.status !== 'inactive') || listType !== 'operation') {
      List.findOne({type: listType, remote_id: item.id}, function (err, list) {
        if (!list) {
          visibility = 'all';
          if (item.hid_access && item.hid_access == 'closed') {
            visibility = 'verified';
          }
          label = item.label;
          if (listType === 'bundle') {
            label = item.operation[0].label + ': ' + item.label;
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
          List.create(tmpList, function (err, li) {
            if (err) {
              app.log.error(err);
              return cb(err);
            }
            if (li.type === 'disaster') {
              _notifyNewDisaster(li);
            }
            cb();
          });
        }
        else {
          cb();
        }
      });
    }
    else {
      cb();
    }
  };

  var lastPull = 0;
  //Cache.then((mongoCache) => {
    //return mongoCache.get('lastPull', function (err, lastPull) {
      //if (err) app.log.info(err)
      if (!lastPull) {
        lastPull = 0;
      }
      // For each list type
      async.eachSeries(listTypes,
        function(listType, nextType) {
          // Parse while there are pages
          async.doWhilst(function (nextPage) {
            path = '/api/v1.0/' + listType + 's?page=' + pageNumber + '&filter[created][value]=' + lastPull + '&filter[created][operator]=>';
            if (listType === 'organization') {
              path = '/api/v1.0/' + listType + 's?page=' + pageNumber;
            }
            https.get({
              host: 'www.humanitarianresponse.info',
              port: 443,
              path: path
            }, function (response) {
              pageNumber++;
              var body = '';
              response.on('data', function (d) {
                body += d;
              });
              response.on('end', function() {
                var parsed = {};
                try {
                  parsed = JSON.parse(body);
                  hasNextPage = parsed.next ? true: false;
                  async.eachSeries(parsed.data, function (item, cb) {
                    // Do not add disasters more than 2 years old
                    if (listType !== 'disaster' || (listType === 'disaster' && now - item.created < 2 * 365 * 24 * 3600)) {
                      _createList(listType, item, cb);
                    }
                  }, function (err) {
                    setTimeout(function() {
                      app.log.info('Done loading page ' + pageNumber + ' for ' + listType);
                      nextPage();
                    }, 1000);
                  });
                } catch (e) {
                  app.log.info('Error parsing hrinfo API: ' + e);
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
        var currentTime = Math.round(Date.now() / 1000);
        // Keep item in cache 12 minutes (720 seconds)
        app.log.info(currentTime);
        /*mongoCache.set('lastPull', currentTime, {ttl: 720}, function (err) {
          app.log.info(err);
        });*/
        app.log.info('Done processing all list types');
      });
    //});
  //});
};

var sendReminderVerifyEmails = function (app) {
  const User = app.orm.User;
  const EmailService = app.services.EmailService;
  app.log.info('sending reminder emails to verify addresses');
  var stream = User.find({'email_verified': false}).stream();

  stream.on('data', function(user) {
    if (user.shouldSendReminderVerify()) {
      this.pause();

      var now = Date.now(), that = this;
      // Make sure user is not an orphan
      if (!user.createdBy) {
        EmailService.sendReminderVerify(user, function (err) {
          if (err) {
            app.log.error(err);
            that.resume();
          }
          else {
            user.remindedVerify = now.valueOf();
            user.timesRemindedVerify = user.timesRemindedVerify + 1;
            user.save();
            that.resume();
          }
        });
      }
    }
  });

  stream.on('close', function () {
    cb();
  });
};

var sendReminderUpdateEmails = function (app) {
  app.log.info('Sending reminder update emails to contacts');
  const d = new Date(),
    sixMonthsAgo = d.valueOf() - 183 * 24 * 3600 * 1000,
    User = app.orm.User,
    EmailService = app.services.EmailService;

  var stream = User.find({
    'updatedAt': { $lt: sixMonthsAgo }
  }).stream();

  stream.on('data', function(user) {
    this.pause();
    const that = this,
      now = new Date();
    if (user.shouldSendReminderUpdate()) {
      EmailService.sendReminderUpdate(user, function (err) {
        if (err) {
          app.log.error(err);
        }
        else {
          user.remindedUpdate = now;
          user.save();
        }
        that.resume();
      });
    }
  });

  stream.on('close', function () {
    cb();
  });
};

var sendReminderCheckoutEmails = function(app) {
  app.log.info('Sending reminder checkout emails to contacts');
  const ListUser = app.orm.ListUser;
  var stream = ListUser
    .find({'remindedCheckout': false, 'user.email_verified': true })
    .populate('user list')
    .stream();

  stream.on('data', function(lu) {
    let that = this;
    if (lu.shouldSendReminderCheckout()) {
      this.pause();
      notification = {type: 'reminder_checkout', user: lu.user, params: {listUser: lu, list: lu.list}};
      NotificationService.send(notification, () => {
        lu.remindedCheckout = true;
        lu.save();
        that.resume();
      });
    }
  });

  stream.on('close', function () {
    cb();
  });
};

var doAutomatedCheckout = function (app) {
  app.log.info('Running automated checkouts');
  const User = app.orm.user,
    listTypes = app.services.ListService.getUserListAttributes(),
    NotificationService = app.services.NotificationService;
  var stream = User.find({}).stream();

  stream.on('data', function (user) {
    this.pause();
    var checkins = user.shouldDoAutomatedCheckout();
    if (checkins.length) {
      notification = {type: 'automated_checkout', params: {checkins: checkins}};
      NotificationService.send(user, notification, () => {
        var i,j,k;
        for (i = 0; i < listTypes.length; i++) {
          var tmpCheckins = user[listTypes[i]];
          if (tmpCheckins.length) {
            for (j = 0; j < tmpCheckins.length; j++) {
              var tmpCheckin = tmpCheckins[j];
              for (k = 0; k < checkins.length; k++) {
                if (tmpCheckin._id === checkins[k]._id) {
                  tmpCheckin.remindedCheckout = true;
                  userModified = true;
                }
              }
            }
          }
        }
      });
      var remindedCheckoutDate = new Date(contact.remindedCheckoutDate);
      var dateOptions = { day: "numeric", month: "long", year: "numeric" };
      var mailOptions = {
        to: contact.mainEmail(false),
        subject: 'Automated checkout',
        firstName: contact.nameGiven,
        location: contact.location,
        remindedCheckoutDate: remindedCheckoutDate.toLocaleDateString('en', dateOptions),
        remindedCheckoutDateFR: remindedCheckoutDate.toLocaleDateString('fr', dateOptions),
        checkinLink: process.env.APP_BASE_URL + '/#/contact/' + contact._id + '/checkin'
      };
      contact.checkout(function(err) {
        if (!err) {
          mail.sendTemplate('automated_checkout', mailOptions, function (err, info) {
            if (!err) {
              console.log('INFO: sent automated checkout email to ' + contact.mainEmail());
            }
          });
        }
      });
    }
  });

  stream.on('close', function () {
    cb();
  });
};
