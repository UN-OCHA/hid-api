'use strict';

const _ = require('lodash');
const https = require('https');
const crypto = require('crypto');
const async = require('async');
const Libphonenumber = require('google-libphonenumber');
const profilesUrl = 'profiles.humanitarian.id';
const clientId = process.env.V1_PROFILES_CLIENT_ID;
const clientSecret = process.env.V1_PROFILES_CLIENT_SECRET;
const allowedVoips = ['Skype', 'Google', 'Facebook', 'Yahoo', 'Twitter'];
const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

module.exports = {
  parseGlobal: function (item, user) {
    var tmpUserId = item._profile.userid.split('_');
    var uidLength = tmpUserId.length;
    user.user_id = item._profile.userid;
    user.legacyId = item._profile._id;
    user.given_name = item.nameGiven.trim();
    user.family_name = item.nameFamily.trim();
    if (uidLength === 1) {
      user.email = '';
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
      user.is_orphan = false;
      user.is_ghost = false;
      if (!item._profile.firstUpdate) {
        user.is_orphan = true;
        user.email_verified = false;
      }
    }
    //user.remindedVerify = '';
    //user.timesRemindedVerify = '';
    //user.remindedUpdate = '';
    user.verified = item._profile.verified ? item._profile.verified : false;
    user.locale = 'en';
    user.job_title = item.jobtitle ? item.jobtitle : '';
    user.status = item.notes ? item.notes : '';
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

  parseLocal: function (item, user) {
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
    item.email.forEach(function (email) {
      var emailFound = false;
      user.emails.forEach(function (email2) {
        if (email2.email === email.address) {
          emailFound = true;
        }
      });
      if (!emailFound) {
        user.emails.push({
          type: 'Work',
          email: email.address,
          validated: email.address === user.email ? true : false
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
  },

  migrate: function (app) {
    const User = app.orm.User;
    const ListUser = app.orm.ListUser;
    const List = app.orm.List;

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
          if ((it && it.remote_id) || attribute === 'bundles') {
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
                if (list) {
                  return ListUser
                    .findOne({list: list, user: user._id})
                    .then((lu) => {
                      return {list: list, lu: lu};
                    });
                }
                else {
                  console.error('list not found');
                  console.log(criteria);
                  throw new Error('List not found');
                }
              })
              .then((lu) => {
                if (lu.lu) {
                  return lu.lu;
                }
                else {
                  var checkoutDate = null;
                  if (item.departureDate) {
                    checkoutDate = new Date(item.departureDate);
                  }
                  return ListUser
                    .create({list: lu.list, user: user._id, deleted: item.status, checkoutDate: checkoutDate, pending: false})
                    .then((clu) => {
                      return clu;
                    });
                }
              })
              .then((lu) => {
                var userAttribute = attribute;
                if (attribute === 'organization') {
                  userAttribute += 's';
                  if (index === 0) {
                    user.organization = lu;
                  }
                }
                var luFound = false;
                user[userAttribute].forEach(function (it) {
                  if (it._id.toString() === lu._id.toString()) {
                    luFound = true;
                  }
                });
                if (!luFound) {
                  user[userAttribute].push(lu);
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
          setCheckins(item, user, 'organization', callback);
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
          setCheckins(item, user, 'functional_roles', callback);
        },
        function (callback) {
          setCheckins(item, user, 'offices', callback);
        },
        function (callback) {
          setVerifiedBy(item, user, callback);
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
              total = parsed.count;
              async.eachSeries(parsed.contacts, function (item, cb) {
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
                    if (item.type === 'global') {
                      if (!user.password) {
                        user.password = User.hashPassword(Math.random().toString(36).slice(2));
                      }
                      app.config.migrate.parseGlobal(item, user);
                      app.config.migrate.parseLocal(item, user);
                      if (createUser) {
                        User
                          .create(user)
                          .then((newUser) => {
                            cb();
                          })
                          .catch(err => {
                            console.error(err);
                            cb();
                          });
                      }
                      else {
                        parseCheckins(item, user, cb);
                      }
                    }
                    else {
                      // Local profile
                      if (createUser) {
                        cb();
                      }
                      else {
                        app.config.migrate.parseLocal(item, user);
                        parseCheckins(item, user, cb);
                      }
                    }
                  })
                  .catch((err) => {
                    console.error(err);
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
        console.log('done with users migration');
      });
  },

  migrateLists: function (app) {
    console.log('migrating lists');
    const User = app.orm.User;
    const ListUser = app.orm.ListUser;
    const List = app.orm.List;

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
                          User
                            .find({'legacyId': {$in: item.contacts}})
                            .then((contacts) => {
                              async.eachSeries(contacts, function (contact, next) {
                                ListUser
                                  .findOne({list: list, user: contact._id})
                                  .then((lu) => {
                                    if (!lu) {
                                      ListUser
                                        .create({list: list, user: contact._id, deleted: false, checkoutDate: null, pending: false})
                                        .then((clu) => {
                                          next();
                                        });
                                    }
                                    else {
                                      next();
                                    }
                                  });
                              }, function (err) {
                                callback();
                              });
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
    const ListUser = app.orm.ListUser;
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
                    var privacy = item.privacy ? item.privacy : 'all';
                    if (privacy === 'some') {
                      privacy = 'me';
                    }
                    srv.legacyId = item._id;
                    srv.name = item.name;
                    srv.description = '';
                    srv.hidden = item.hidden;
                    srv.type = item.type;

                    if (createSrv) {
                      return Service
                        .create(srv)
                        .then((newSrv) => {
                          console.log('created service');
                          cb();
                        });
                    }
                    else {
                      return srv
                        .save()
                        .then(() => {
                          console.log('saved service' + srv.name);
                          cb();
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
