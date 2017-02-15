'use strict';

const _ = require('lodash');
const https = require('https');
const crypto = require('crypto');
const async = require('async');
const Libphonenumber = require('google-libphonenumber');
const profilesUrl = 'profiles.humanitarian.id';
const authUrl = 'auth.humanitarian.id';
const clientId = process.env.V1_PROFILES_CLIENT_ID;
const clientSecret = process.env.V1_PROFILES_CLIENT_SECRET;
const authClientId = process.env.V1_AUTH_CLIENT_ID;
const authClientSecret = process.env.V1_AUTH_CLIENT_SECRET;
const allowedVoips = ['Skype', 'Google', 'Facebook', 'Yahoo', 'Twitter'];
const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

module.exports = {
  parseGlobal: function (item, user) {
    var tmpUserId = item._profile.userid.split('_');
    var uidLength = tmpUserId.length;
    user.legacyId = item._profile._id;
    user.is_orphan = false;
    user.is_ghost = false;
    if (!item._profile.firstUpdate) {
      user.is_orphan = true;
      user.email_verified = false;
    }
    //user.remindedVerify = '';
    //user.timesRemindedVerify = '';
    //user.remindedUpdate = '';
    user.verified = item._profile.verified ? item._profile.verified : false;
    user.locale = 'en';
    if (item.type === 'global' || (item.type === 'local' && !user.job_title && item.status)) {
      user.job_title = item.jobtitle ? item.jobtitle : '';
    }
    if (item.type === 'global' || (item.type === 'local' && !user.status && item.status)) {
      user.status = item.notes ? item.notes : '';
    }
    user.is_admin = false;
    if (item._profile.roles.indexOf('admin') !== -1) {
      user.verified = true;
      user.is_admin = true;
    }
    user.isManager = false;
    if (item._profile.roles && item._profile.roles.length) {
      item._profile.roles.forEach(function (role) {
        if (role.indexOf('manager') !== -1) {
          user.isManager = true;
        }
      });
    }
    if (!item.expires || item.expires === false) {
      user.expires = new Date(0, 0, 1, 0, 0, 0);
    }
    //user.lastLogin = '';
    /*user.createdBy = '';
    user.favoriteLists = '';
    user.subscriptions = '';*/
    user.deleted = false;
    user.createdAt = tmpUserId[uidLength - 1];
    user.updatedAt = item.revised ? item.revised : '';
  },

  parseLocal: function (item, user, countries) {
    var isValidPhoneNumber = function (number) {
      try {
        const phoneUtil = Libphonenumber.PhoneNumberUtil.getInstance();
        const phone = phoneUtil.parse(number);
        return phoneUtil.isValidNumber(phone);
      }
      catch (e) {
        return false;
      }
    };

    if (item.type === 'local') {
      item.operations = [];
      item.operations.push({remote_id: item.locationId});
      item.bundles = _.concat(item.bundle, item.protectedBundles);
      item.offices = item.office;
    }
    item.functional_roles = item.protectedRoles;
    user.legacyId = item._profile._id;
    if (!user.emails) {
      user.emails = [];
    }
    if (item.status) {
      item.email.forEach(function (email) {
        var emailFound = false;
        user.emails.forEach(function (email2) {
          if (email2.email === email.address) {
            emailFound = true;
          }
        });
        if (!emailFound && /^([\w-\.\+]+@([\w-]+\.)+[\w-]{2,4})?$/.test(email.address)) {
          user.emails.push({
            type: 'Work',
            email: email.address,
            validated: email.address === user.email && user.email_verified ? true : false
          });
        }
      });
      if (!user.voips) {
        user.voips = [];
      }
      item.voip.forEach(function (voip) {
        if (voip.type === 'yahoo.fr') {
          voip.type = 'Yahoo';
        }
        if (allowedVoips.indexOf(voip.type) !== -1) {
          var voipFound = false;
          user.voips.forEach(function (voip2) {
            if (voip2.type === voip.type) {
              voipFound = true;
            }
          });
          if (!voipFound) {
            user.voips.push({
              type: voip.type,
              username: voip.number
            });
          }
        }
        else {
          console.error(voip.type);
        }
      });
      if (!user.websites) {
        user.websites = [];
      }
      item.uri.forEach(function (uri) {
        var uriFound = false;
        user.websites.forEach(function (uri2) {
          if (uri2.url === uri) {
            uriFound = true;
          }
        });
        if (!uriFound && urlRegex.test(uri)) {
          user.websites.push({
            url: uri
          });
        }
      });
      if (!user.phone_numbers) {
        user.phone_numbers = [];
      }
      if (item.phone && item.phone.length) {
        item.phone.forEach(function (phone, index) {
          if (!phone.number || !phone.type) {
            return;
          }
          if (phone.number.startsWith('00')) {
            phone.number = '+' + phone.number.slice(2);
          }
          if (isValidPhoneNumber(phone.number)) {
            if (index === 0 && item.type === 'global') {
              user.phone_number = phone.number;
              user.phone_number_type = phone.type;
            }
            var phoneFound = false;
            user.phone_numbers.forEach(function (phone2) {
              if (phone2.number === phone.number) {
                phoneFound = true;
              }
            });
            if (!phoneFound) {
              user.phone_numbers.push({
                type: phone.type,
                number: phone.number,
                validated: false
              });
            }
          }
        });
      }
      if (!user.job_titles) {
        user.job_titles = [];
      }
      if (item.jobtitle) {
        var jobFound = false;
        user.job_titles.forEach(function (jobtitle) {
          if (jobtitle === item.jobtitle) {
            jobFound = true;
          }
        });
        if (!jobFound) {
          user.job_titles.push(item.jobtitle);
        }
      }
      if (!user.location) {
        user.location = {};
      }
      if (!user.locations) {
        user.locations = [];
      }
      if (item.address && item.address.length) {
        item.address.forEach(function (address, index) {
          if (!address.country && !address.administrative_area && !address.locality) {
            return;
          }
          var tmpAddress = {};
          if (address.country) {
            tmpAddress.country = { name: address.country};
            for (var i = 0; i < countries.length; i++) {
              if (address.country === countries[i].name) {
                tmpAddress.country.id = countries[i].id;
              }
            }
          }
          if (address.administrative_area) {
            tmpAddress.region = { name: address.administrative_area};
          }
          if (address.locality) {
            tmpAddress.locality = address.locality;
          }
          if (index === 0 && item.type === 'global') {
            user.location = tmpAddress;
          }
          var addressFound = false;
          user.locations.forEach(function (address2) {
            var country = '', country2 = '', region = '', region2 = '', locality = '', locality2 = '';
            country = address.country ? address.country : '';
            country2 = address2.country ? address2.country.name : '';
            region = address.administrative_area ? address.administrative_area : '';
            region2 = address2.region ? address2.region.name : '';
            locality = address.locality ? address.locality : '';
            locality2 = address2.locality ? address2.locality : '';

            if (country == country2 && region === region2 && locality === locality2) {
              addressFound = true;
            }
          });
          if (!addressFound) {
            user.locations.push(tmpAddress);
          }
        });
      }
    }
  },

  migrate: function (app) {
    const User = app.orm.User;
    const List = app.orm.List;
    const Service = app.orm.Service;

    var countries = [];

    var getCountries = function (cb) {
      var options = {
        hostname: 'www.humanitarianresponse.info',
        path: '/hid/locations/countries'
      };
      https.get(options, (res) => {
        var body = '';
        res.on('data', function (d) {
          body += d;
        });
        res.on('end', function() {
          try {
            var parsed = JSON.parse(body);
            var keys = Object.keys(parsed);
            var vals = _.values(parsed);
            for (var i = 0; i < keys.length; i++) {
              countries.push({
                id: keys[i],
                name: vals[i]
              });
            }
            cb();
          }
          catch (e) {
            console.error(e);
          }
        });
      });
    };

    var setVerifiedBy = function (item, user, cb) {
      if (item.verified && item.verifiedById) {
        User
          .findOne({legacyId: item.verifiedById})
          .then((verifier) => {
            if (verifier) {
              user.verified_by = verifier._id;
            }
            cb();
          })
          .catch((err) => {
            console.error(err);
            cb();
          });
      }
      else {
        cb();
      }
    };

    var setCheckins = function (item, user, attribute, cb) {
      var criteria = {};
      if (item[attribute] && item[attribute].length) {
        async.eachOfSeries(item[attribute], function (it, index, next) {
          if ((it && it.remote_id) || attribute === 'bundles' || attribute === 'functional_roles') {
            if (attribute === 'organization') {
              criteria = {'type': 'organization', 'remote_id': it.remote_id.replace('hrinfo_org_', '')};
            }
            else if (attribute === 'disasters') {
              if (it.remote_id.indexOf('hrinfo:') !== -1) {
                criteria = {'type': 'disaster', 'remote_id': it.remote_id.replace('hrinfo:', '')};
              }
              if (it.remote_id.indexOf('rwint:') !== -1) {
                criteria = {'type': 'disaster', 'metadata.@id': 'http://api.reliefweb.int/v1/disasters/' + it.remote_id.replace('rwint:','')};
              }
            }
            else if (attribute === 'operations') {
              criteria = {'type': 'operation', 'remote_id': it.remote_id.replace('hrinfo:', '')};
            }
            else if (attribute === 'bundles') {
              criteria = {'type': 'bundle', 'metadata.operation.id': item.locationId.replace('hrinfo:', ''), 'metadata.label': it};
            }
            else if (attribute === 'functional_roles') {
              criteria = {'type': 'functional_role', 'remote_id': it};
            }
            else if (attribute === 'offices') {
              criteria = {type: 'office', 'remote_id': it.remote_id.replace('hrinfo_off_', '')};
            }
            List
              .findOne(criteria)
              .then((list) => {
                if (!list) {
                  console.error('list not found');
                  console.log(criteria);
                  throw new Error('List not found');
                }
                else {
                  return list;
                }
              })
              .then((list) => {
                var userAttribute = attribute;
                var lu = {list: list._id, name: list.name, acronym: list.acronym, visibility: list.visibility, deleted: !item.status, pending: false};
                lu.names = list.names;
                lu.acronyms = list.acronyms;
                if (attribute === 'organization') {
                  userAttribute += 's';
                  if (index === 0) {
                    user.organization = lu;
                  }
                }
                var luFound = false, luIndex = -1;
                user[userAttribute].forEach(function (it2, index) {
                  var itId = it2.list._id ? it2.list._id : it2.list;
                  if (itId.toString() === list._id.toString()) {
                    luFound = true;
                    luIndex = index;
                  }
                });
                if (!luFound) {
                  var checkoutDate = null;
                  if (item.departureDate) {
                    checkoutDate = new Date(item.departureDate);
                  }
                  lu.checkoutDate = checkoutDate;
                  user[userAttribute].push(lu);
                }
                else {
                  if (luIndex !== -1) {
                    user[userAttribute][luIndex].names = list.names;
                    user[userAttribute][luIndex].acronyms = list.acronyms;
                  }
                }
                next();
              })
              .catch((err) => {
                next();
              });
          }
          else {
            next();
          }
        }, cb);
      }
      else {
        cb();
      }
    };

    var parseCheckins = function (item, user, cb) {
      async.series([
        function (callback) {
          if (item.status) {
            setCheckins(item, user, 'organization', callback);
          }
          else {
            callback();
          }
        },
        function (callback) {
          setCheckins(item, user, 'disasters', callback);
        },
        function (callback) {
          setCheckins(item, user, 'operations', callback);
        },
        function (callback) {
          setCheckins(item, user, 'bundles', callback);
        },
        function (callback) {
          if (item.status) {
            setCheckins(item, user, 'functional_roles', callback);
          }
          else {
            callback();
          }
        },
        function (callback) {
          if (item.status) {
            setCheckins(item, user, 'offices', callback);
          }
          else {
            callback();
          }
        },
        function (callback) {
          setVerifiedBy(item, user, callback);
        },
        function (callback) {
          if (!user.subscriptions) {
            user.subscriptions = [];
          }
          if (item._profile.subscriptions && item._profile.subscriptions.length) {
            async.eachSeries(item._profile.subscriptions, function (sub, next) {
              Service
                .findOne({'legacyId': sub.service})
                .then((srv) => {
                  if (srv) {
                    if (user.subscriptionsIndex(srv._id) === -1) {
                      user.subscriptions.push({email: sub.email, service: srv._id});
                    }
                  }
                  next();
                })
                .catch((err) => {
                  console.error(err);
                });
            }, function (err, results) {
              callback();
            });
          }
          else {
            callback();
          }
        },
        function (callback) {
          user
            .save()
            .then(() => {
              callback();
            })
            .catch((err) => {
              console.error(err);
              console.log('error in saving');
              callback(err);
            });
        }
      ], function (err, results) {
        cb();
      });
    };

    // HID-1310 do not migrate orphans from Haiti, Ecuador and Nepal
    const noOperations = [85,78,17026];
    var query = {
      limit: 50,
      skip: 0
    };
    var total = 60;

    getCountries(function () {
      async.whilst(
        function () { return query.skip < total; },
        function (nextPage) {
          var queryString = '';
          var keys = Object.keys(query);
          for (var i = 0; i < keys.length; i++) {
            if (i > 0) {
              queryString += '&';
            }
            queryString += keys[i] + '=' + query[keys[i]];
          }
          var key = '';
          keys.forEach(function (k) {
            key += query[k];
          });
          key += clientSecret;
          var hash = crypto.createHash('sha256').update(key).digest('hex');
          var options = {
            hostname: profilesUrl,
            path: '/v0/contact/view?' + queryString + '&_access_client_id=' + clientId + '&_access_key=' + hash
          };
          https.get(options, (res) => {
            var body = '', users = [], tmpUserId = [], uidLength = 0, createUser = false;
            res.on('data', function (d) {
              body += d;
            });
            res.on('end', function() {
              var parsed = {};
              try {
                parsed = JSON.parse(body);
                if (parsed.count) {
                  total = parsed.count;
                  async.eachSeries(parsed.contacts, function (item, cb) {

                    // HID-1310 do not migrate orphans from Haiti Ecuador and Nepal
                    if ((item.type === 'local' && !item._profile.firstUpdate && noOperations.indexOf(item.locationId.replace('hrinfo:', '')) !== -1)
                    || (!item.status)) {
                      cb();
                    }
                    else {
                      User
                        .findOne({'user_id': item._profile.userid})
                        .then((user) => {
                          if (!user) {
                            user = {};
                            createUser = true;
                          }
                          else {
                            createUser = false;
                          }
                          if (!user.password) {
                            user.password = User.hashPassword(Math.random().toString(36).slice(2));
                          }
                          app.config.migrate.parseGlobal(item, user);
                          app.config.migrate.parseLocal(item, user, countries);
                          if (createUser) {
                            console.log('Creating user with user ID: ' + item._profile.userid);
                            var tmpUserId = item._profile.userid.split('_');
                            var uidLength = tmpUserId.length;
                            user.user_id = item._profile.userid;
                            if (item.type === 'global' || (item.type === 'local' && !user.given_name)) {
                              user.given_name = item.nameGiven.trim();
                            }
                            if (item.type === 'global' || (item.type === 'local' && !user.family_name)) {
                              user.family_name = item.nameFamily.trim();
                            }
                            if (uidLength === 1) {
                              user.email_verified = false;
                              if (!item._profile.firstUpdate) {
                                user.is_ghost = true;
                                user.is_orphan = false;
                              }
                            }
                            else {
                              if (uidLength === 2) {
                                user.email = tmpUserId[0];
                              }
                              else {
                                user.email = '';
                                for (var i = 0; i < uidLength - 1; i++) {
                                  user.email += tmpUserId[i];
                                  if (i < uidLength - 2) {
                                    user.email += '_';
                                  }
                                }
                              }
                              user.email_verified = true;
                            }
                            User
                              .create(user)
                              .then((newUser) => {
                                parseCheckins(item, newUser, cb);
                              })
                              .catch(err => {
                                console.error(err);
                                cb();
                              });
                          }
                          else {
                            parseCheckins(item, user, cb);
                          }
                        })
                        .catch((err) => {
                          console.error(err);
                        });
                      }
                    }, function (err) {
                      query.skip += 50;
                      console.log('page ' + query.skip / 50);
                      setTimeout(function() {
                        nextPage();
                      }, 3000);
                    });
                }
                else {
                  console.log('issue with total');
                  console.log('page ' + query.skip / 50);
                  setTimeout(function() {
                    nextPage();
                  }, 3000);
                }
              } catch (e) {
                console.error(e);
                nextPage();
              }
            });
          }).on('error', (e) => {
            console.error(e);
          });
        },
        function (err, n) {
          console.log('done with users migration');
        });
      });
  },

  migrateAuth: function (app) {
    const User = app.orm.User;

    var query = {
      limit: 100,
      offset: 0
    };
    var total = 150;

    async.whilst(
      function () { return query.offset < total; },
      function (nextPage) {
        var queryString = '';
        var keys = Object.keys(query);
        for (var i = 0; i < keys.length; i++) {
          if (i > 0) {
            queryString += '&';
          }
          queryString += keys[i] + '=' + query[keys[i]];
        }
        var key = '';
        keys.forEach(function (k) {
          key += query[k];
        });
        key += authClientSecret;
        var hash = crypto.createHash('sha256').update(key).digest('hex');
        var options = {
          hostname: authUrl,
          path: '/api/users?' + queryString + '&client_key=' + authClientId + '&access_key=' + hash
        };
        https.get(options, (res) => {
          var body = '', users = [], tmpUserId = [], uidLength = 0, createUser = false;
          res.on('data', function (d) {
            body += d;
          });
          res.on('end', function() {
            var parsed = {};
            try {
              parsed = JSON.parse(body);
              if (parsed.count) {
                total = parsed.count;
                async.eachSeries(parsed.data, function (item, cb) {
                  User
                    .findOne({'user_id': item.user_id})
                    .then((user) => {
                      if (!user) {
                        var deleted = false;
                        if (item.active === 0) {
                          deleted = true;
                        }
                        var tmpUser = {
                          given_name: item.name_given,
                          family_name: item.name_family,
                          email: item.email,
                          email_verified: true,
                          user_id: item.user_id,
                          expires: new Date(0, 0, 1, 0, 0, 0),
                          emails: [],
                          deleted: deleted
                        };
                        tmpUser.emails.push({
                          type: 'Work',
                          email: item.email,
                          validated: true
                        });
                        tmpUser.password = User.hashPassword(Math.random().toString(36).slice(2));
                        User
                          .create(tmpUser)
                          .then((newUser) => {
                            cb();
                          })
                          .catch(err => {
                            console.error(err);
                            cb();
                          });
                      }
                      else {
                        cb();
                      }
                    })
                    .catch((err) => {
                      console.error(err);
                      cb();
                    });
                  }, function (err) {
                    query.offset += 100;
                    console.log('page ' + query.offset / 100);
                    setTimeout(function() {
                      nextPage();
                    }, 3000);
                  });
                }
                else {
                  console.log('issue with total');
                  console.log('page ' + query.offset / 100);
                  setTimeout(function() {
                    nextPage();
                  }, 3000);
                }
            } catch (e) {
              console.error(e);
              nextPage();
            }
          });
        }).on('error', (e) => {
          console.error(e);
        });
      },
      function (err, n) {
        console.log('done with auth migration');
      });
  },

  migrateLists: function (app) {
    console.log('migrating lists');
    const User = app.orm.User;
    const List = app.orm.List;
    const Service = app.orm.Service;

    var getProfileId = function (contactId, cb) {
      var query = {
        contactId: contactId
      };
      var queryString = '';
      var keys = Object.keys(query);
      for (var i = 0; i < keys.length; i++) {
        if (i > 0) {
          queryString += '&';
        }
        queryString += keys[i] + '=' + query[keys[i]];
      }
      var key = '';
      keys.forEach(function (k) {
        key += query[k];
      });
      key += clientSecret;
      var hash = crypto.createHash('sha256').update(key).digest('hex');
      var options = {
        hostname: profilesUrl,
        path: '/v0/profile/view?' + queryString + '&_access_client_id=' + clientId + '&_access_key=' + hash
      };
      https.get(options, (res) => {
        var body = '';
        res.on('data', function (d) {
          body += d;
        });
        res.on('end', function() {
          var parsed = {};
          try {
            parsed = JSON.parse(body);
            setTimeout(function() {
              cb(parsed.profile._id);
            }, 3000);
          }
          catch (err) {
            console.log(body);
            console.error(err);
            cb();
          }
        });
      });
    };

    var query = {
      limit: 30,
      skip: 0
    };
    var total = 60;

    async.whilst(
      function () { return query.skip < total; },
      function (nextPage) {
        var queryString = '';
        var keys = Object.keys(query);
        for (var i = 0; i < keys.length; i++) {
          if (i > 0) {
            queryString += '&';
          }
          queryString += keys[i] + '=' + query[keys[i]];
        }
        var key = '';
        keys.forEach(function (k) {
          key += query[k];
        });
        key += clientSecret;
        var hash = crypto.createHash('sha256').update(key).digest('hex');
        var options = {
          hostname: profilesUrl,
          path: '/v0.1/lists?' + queryString + '&_access_client_id=' + clientId + '&_access_key=' + hash
        };
        https.get(options, (res) => {
          var body = '', createList = false;
          res.on('data', function (d) {
            body += d;
          });
          res.on('end', function() {
            var parsed = {};
            try {
              parsed = JSON.parse(body);
              total = res.headers['x-total-count'];
              async.eachSeries(parsed, function (item, cb) {
                List
                  .findOne({'legacyId': item._id})
                  .then((list) => {
                    if (!list) {
                      list = {};
                      createList = true;
                    }
                    else {
                      createList = false;
                    }
                    var privacy = item.privacy ? item.privacy : 'all';
                    if (privacy === 'some') {
                      privacy = 'me';
                    }
                    list.legacyId = item._id;
                    list.label = item.name;
                    list.labels = [];
                    list.labels.push({text: item.name, language: 'en'});
                    list.type = 'list';
                    list.visibility = privacy;
                    list.joinability = 'public';

                    if (createList) {
                      return List
                        .create(list)
                        .then((newList) => {
                          console.log('created list');
                          cb();
                        });
                    }
                    else {
                      async.series([
                        function (callback) {
                          User
                            .findOne({'user_id': item.userid})
                            .then((owner) => {
                              if (owner) {
                                list.owner = owner._id;
                              }
                              callback();
                            });
                        },
                        function (callback) {
                          async.eachSeries(item.contacts, function (contactId, next) {
                            getProfileId(contactId, function (pid) {
                              if (pid) {
                                User
                                  .findOne({'legacyId': pid})
                                  .then((user) => {
                                    if (user) {
                                      var luFound = false;
                                      var lu = {list: list._id, name: list.name, acronym: list.acronym, visibility: list.visibility, deleted: false, checkoutDate: null, pending: false};
                                      user.lists.forEach(function (it) {
                                        if (it.list.toString() === list._id.toString()) {
                                          luFound = true;
                                        }
                                      });
                                      if (!luFound) {
                                        user.lists.push(lu);
                                        user.save(function (err) {
                                          next();
                                        });
                                      }
                                      else {
                                        next();
                                      }
                                    }
                                    else {
                                      next();
                                    }
                                  })
                                  .catch((err) => {
                                    console.error(err);
                                  });
                              }
                              else {
                                next();
                              }
                            });
                          }, function (err) {
                            callback();
                          });
                        },
                        function (callback) {
                          if (!list.managers) {
                            list.managers = [];
                          }
                          User
                            .find({'legacyId': {$in: item.editors}})
                            .then((editors) => {
                              editors.forEach(function (editor) {
                                var editorFound = false;
                                list.managers.forEach(function (manager) {
                                  if (manager === editor._id) {
                                    editorFound = true;
                                  }
                                });
                                if (!editorFound) {
                                  list.managers.push(editor._id);
                                }
                              });
                              callback();
                            });
                        },
                        function (callback) {
                          if (item.services && item.services.length) {
                            async.eachSeries(item.services, function (srvId, next) {
                              Service
                                .findOne({'legacyId': srvId})
                                .then((service) => {
                                  if (service) {
                                    var srvFound = false;
                                    if (list.services && list.services.length) {
                                      list.services.forEach(function (listSrv) {
                                        if (listSrv === service._id) {
                                          srvFound = true;
                                        }
                                      });
                                    }
                                    if (!srvFound) {
                                      service.lists.push(list._id);
                                      service.save();
                                    }
                                  }
                                  next();
                                });
                              }, function (err, results) {
                                callback();
                              });
                          }
                          else {
                            callback();
                          }
                        }
                      ], function (err, results) {
                        return list
                          .save()
                          .then(() => {
                            console.log('saved list' + list.label);
                            cb();
                          });
                      });
                    }
                  })
                  .catch((err) => {
                    console.error(err);
                    cb();
                  });
              }, function (err) {
                query.skip += 30;
                console.log('page ' + query.skip / 30);
                setTimeout(function() {
                  nextPage();
                }, 3000);
              });
            } catch (e) {
              console.error(e);
              nextPage();
            }
          });
        }).on('error', (e) => {
          console.error(e);
        });
      },
      function (err, n) {
        console.log('done with lists migration');
      });
  },

  migrateServices: function (app) {
    console.log('migrating services');
    const User = app.orm.User;
    const List = app.orm.List;
    const Service = app.orm.Service;

    var query = {
      limit: 30,
      skip: 0
    };
    var total = 60;

    async.whilst(
      function () { return query.skip < total; },
      function (nextPage) {
        var queryString = '';
        var keys = Object.keys(query);
        for (var i = 0; i < keys.length; i++) {
          if (i > 0) {
            queryString += '&';
          }
          queryString += keys[i] + '=' + query[keys[i]];
        }
        var key = '';
        keys.forEach(function (k) {
          key += query[k];
        });
        key += clientSecret;
        var hash = crypto.createHash('sha256').update(key).digest('hex');
        var options = {
          hostname: profilesUrl,
          path: '/v0.1/services?' + queryString + '&_access_client_id=' + clientId + '&_access_key=' + hash
        };
        https.get(options, (res) => {
          var body = '', createSrv = false;
          res.on('data', function (d) {
            body += d;
          });
          res.on('end', function() {
            var parsed = {};
            try {
              parsed = JSON.parse(body);
              total = res.headers['x-total-count'];
              async.eachSeries(parsed, function (item, cb) {
                Service
                  .findOne({'legacyId': item._id})
                  .then((srv) => {
                    if (!srv) {
                      srv = {};
                      createSrv = true;
                    }
                    else {
                      createSrv = false;
                    }
                    srv.legacyId = item._id;
                    srv.name = item.name;
                    srv.description = '';
                    srv.hidden = item.hidden;
                    srv.type = item.type;
                    srv.deleted = !item.status;

                    if (srv.type === 'mailchimp') {
                      srv.mailchimp = {
                        apiKey: item.mc_api_key,
                        list: {
                          id: item.mc_list.id,
                          name: item.mc_list.name
                        }
                      };
                    }
                    else if (srv.type === 'googlegroup') {
                      srv.googlegroup = {
                        domain: item.googlegroup.domain,
                        group: {
                          id: item.googlegroup.group.id,
                          name: item.googlegroup.group.name
                        }
                      };
                    }

                    if (createSrv) {
                      return Service
                        .create(srv)
                        .then((newSrv) => {
                          console.log('created service');
                          cb();
                        });
                    }
                    else {
                      async.series([
                        function (callback) {
                          User
                            .findOne({'user_id': item.userid})
                            .then((owner) => {
                              if (owner) {
                                srv.owner = owner._id;
                              }
                              callback();
                            });
                        },
                        function (callback) {
                          User
                            .find({'legacyId': {$in: item.owners}})
                            .then((managers) => {
                                managers.forEach(function (manager) {
                                  var managerFound = false;
                                  srv.managers.forEach(function (srvManager) {
                                    if (srvManager === manager._id) {
                                      managerFound = true;
                                    }
                                  });
                                  if (!managerFound) {
                                    srv.managers.push(manager._id);
                                  }
                                });
                                callback();
                              }, function (err) {
                                callback();
                              });
                        }
                      ], function (err, results) {
                        return srv
                          .save()
                          .then(() => {
                            console.log('saved service ' + srv.name);
                            cb();
                          });
                      });
                    }
                  })
                  .catch((err) => {
                    console.error(err);
                    cb();
                  });
              }, function (err) {
                query.skip += 30;
                console.log('page ' + query.skip / 30);
                setTimeout(function() {
                  nextPage();
                }, 3000);
              });
            } catch (e) {
              console.error(e);
              nextPage();
            }
          });
        }).on('error', (e) => {
          console.error(e);
        });
      },
      function (err, n) {
        console.log('done with services migration');
      });
  }
};
