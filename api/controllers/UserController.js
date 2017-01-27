'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const Bcrypt = require('bcryptjs');
const fs = require('fs');
const qs = require('qs');
const ejs = require('ejs');
const http = require('http');
const moment = require('moment');
const async = require('async');
const _ = require('lodash');
const childAttributes = ['lists', 'organization', 'organizations', 'operations', 'bundles', 'disasters', 'functional_roles'];

/**
 * @module UserController
 * @description Generated Trails.js Controller.
 */
module.exports = class UserController extends Controller{

  _getAdminOnlyAttributes () {
    return this._getSchemaAttributes('adminOnlyAttributes', 'adminOnly');
  }

  _getManagerOnlyAttributes () {
    return this._getSchemaAttributes('managerOnlyAttributes', 'managerOnly');
  }

  _getReadonlyAttributes () {
    return this._getSchemaAttributes('readonlyAttributes', 'readonly');
  }

  _getSchemaAttributes (variableName, attributeName) {
    if (!this[variableName] || this[variableName].length === 0) {
      const Model = this.app.orm.user;
      this[variableName] = [];
      var that = this;
      Model.schema.eachPath(function (path, options) {
        if (options.options[attributeName]) {
          that[variableName].push(path);
        }
      });
    }
    return this[variableName];
  }

  _removeForbiddenAttributes (request) {
    var forbiddenAttributes = [];
    forbiddenAttributes = childAttributes.concat(this._getReadonlyAttributes());
    if (!request.params.currentUser || !request.params.currentUser.is_admin) {
      forbiddenAttributes = forbiddenAttributes.concat(this._getAdminOnlyAttributes());
    }
    if (!request.params.currentUser || (!request.params.currentUser.is_admin && !request.params.currentUser.isManager)) {
      forbiddenAttributes = forbiddenAttributes.concat(this._getManagerOnlyAttributes());
    }
    // Do not allow forbiddenAttributes to be updated directly
    for (var i = 0, len = forbiddenAttributes.length; i < len; i++) {
      if (request.payload[forbiddenAttributes[i]]) {
        delete request.payload[forbiddenAttributes[i]];
      }
    }
  }

  _errorHandler (err, reply) {
    return this.app.services.ErrorService.handle(err, reply);
  }

  _createHelper(request, reply) {
    const Model = this.app.orm.User;

    this.log.debug('Preparing request for user creation');

    if (request.payload.email) {
      request.payload.emails = [];
      request.payload.emails.push({type: 'Work', email: request.payload.email, validated: false});
    }

    if (request.payload.password && request.payload.confirm_password) {
      request.payload.password = Model.hashPassword(request.payload.password);
    }
    else {
      // Set a random password
      // TODO: check that the password is random and long enough
      request.payload.password = Model.hashPassword(Math.random().toString(36).slice(2));
    }

    var appVerifyUrl = request.payload.app_verify_url;
    delete request.payload.app_verify_url;

    var registrationType = '';
    if (request.payload.registration_type) {
      registrationType = request.payload.registration_type;
      delete request.payload.registration_type;
    }

    this._removeForbiddenAttributes(request);

    if (request.params.currentUser && registrationType === '') {
      // Creating an orphan user
      request.payload.createdBy = request.params.currentUser._id;
      // If an orphan is being created, do not expire
      request.payload.expires = new Date(0, 0, 1, 0, 0, 0);
    }

    var that = this;
    Model
      .create(request.payload)
      .then((user) => {
        if (!user) {
          throw Boom.badRequest();
        }
        that.log.debug('User successfully created');

        if (user.email) {
          if (!request.params.currentUser) {
            that.app.services.EmailService.sendRegister(user, appVerifyUrl, function (merr, info) {
              return reply(user);
            });
          }
          else {
            // An admin is creating an orphan user or Kiosk registration
            if (registrationType === 'kiosk') {
              that.app.services.EmailService.sendRegisterKiosk(user, appVerifyUrl, function (merr, info) {
                return reply(user);
              });
            }
            else {
              that.app.services.EmailService.sendRegisterOrphan(user, request.params.currentUser, appVerifyUrl, function (merr, info) {
                return reply(user);
              });
            }
          }
        }
        else {
          return reply(user);
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  create (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const Model = this.app.orm.user;

    this.log.debug('[UserController] (create) payload =', request.payload, 'options =', options);

    if (!request.payload.app_verify_url) {
      return reply(Boom.badRequest('Missing app_verify_url'));
    }

    var that = this;
    if (request.payload.email) {
      Model
        .findOne({'emails.email': request.payload.email})
        .then((record) => {
          if (!record) {
            // Create user
            that._createHelper(request, reply);
          }
          else {
            // Unverify user, reactivate account and return it
            record.email_verified = false;
            record.deleted = false;
            record.save().then(() => {
              var appVerifyUrl = request.payload.app_verify_url;
              that.app.services.EmailService.sendRegister(record, appVerifyUrl, function (merr, info) {
                return reply(record);
              });
            });
          }
        })
        .catch(err => {
          that.app.services.ErrorService.handle(err, reply);
        });
    }
    else {
      // Create ghost user
      that._createHelper(request, reply);
    }
  }

  _pdfExport (data, req, format, callback) {
    var filters = [];
    if (req.query.hasOwnProperty('name') && req.query.name.length) {
      filters.push(req.query.name);
    }
    if (req.query.hasOwnProperty('verified') && req.query.verified) {
      filters.push('Verified User');
    }
    if (req.query.hasOwnProperty('is_admin') && req.query.is_admin) {
      filters.push('Administrator');
    }
    data.lists.forEach(function (list, index) {
      if (index > 0) {
        filters.push(list.name);
      }
    });
    // TODO: missing roles
    // TODO: missing location country
    /*  _.each(query, function (val, key) {
        if (['address.country', 'address.administrative_area', 'address.locality', 'bundle', 'office.name', 'organization.name', 'protectedBundles'].indexOf(key) !== -1) {
          filters.push(query[key]);
        }
        else if (key == 'protectedRoles') {
          var prIndex = _.findIndex(protectedRolesData, function (item) {
            return (item.id == val);
          });
          filters.push(protectedRolesData[prIndex].name);
        }
      });
      if (req.query.hasOwnProperty('role') && req.query.role) {
        var role = _.find(rolesData, function (item) {
          return (item.id === req.query.role);
        });
        if (role && role.name) {
          filters.push(role.name);
        }
      }
      */

    data.dateGenerated = moment().format('LL');
    data.filters = filters;
    var template = 'templates/pdf/printList.html';
    if (format === 'meeting-compact') {
      template = 'templates/pdf/printMeetingCompact.html';
    }
    else if (format === 'meeting-comfortable') {
      template = 'templates/pdf/printMeetingComfortable.html';
    }
    var that = this;
    ejs.renderFile(template, data, {}, function (err, str) {
      var postData = qs.stringify({
          'html' : str
        }),
        options = {
          hostname: process.env.WKHTMLTOPDF_HOST,
          port: process.env.WKHTMLTOPDF_PORT || 80,
          path: '/htmltopdf',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
          }
        },
        clientReq;

      // Send the HTML to the wkhtmltopdf service to generate a PDF, and
      // return the output.
      clientReq = http.request(options, function(clientRes) {
        if (clientRes && clientRes.statusCode === 200) {
          clientRes.setEncoding('binary');

          var pdfSize = parseInt(clientRes.headers['content-length']),
            pdfBuffer = new Buffer(pdfSize),
            bytes = 0;

          clientRes.on('data', function(chunk) {
            pdfBuffer.write(chunk, bytes, 'binary');
            bytes += chunk.length;
          });

          clientRes.on('end', function() {
            callback(null, pdfBuffer, bytes);
          });
        }
        else {
          callback('An error occurred while generating PDF');
        }
      });

      // Handle errors with the HTTP request.
      clientReq.on('error', function(e) {
        callback('An error occurred while generating PDF');
      });

      // Write post data containing the rendered HTML.
      clientReq.write(postData);
      clientReq.end();


    });
  }

  _txtExport (users) {
    var out = '';
    for (var i = 0; i < users.length; i++) {
      out += users[i].name + ' <' + users[i].email + '>,';
    }
    return out;
  }

  _csvExport (users) {
    var out = 'Given Name,Family Name,Job Title,Organization,Groups,Country,Admin Area,Phone,Skype,Email,Notes\n',
      org = '',
      country = '',
      region = '',
      jobTitle = '',
      phoneNumber = '',
      skype = '',
      status = '';
    for (var i = 0; i < users.length; i++) {
      org = '';
      country = '';
      region = '';
      skype = '';
      jobTitle = users[i].job_title || ' ';
      phoneNumber = users[i].phone_number || ' ';
      status = users[i].status || ' ';
      if (users[i].organization && users[i].organization.list) {
        org = users[i].organization.list.name;
      }
      if (users[i].location && users[i].location.country) {
        country = users[i].location.country.name;
      }
      if (users[i].location && users[i].location.region) {
        region = users[i].location.region.name;
      }
      if (users[i].voips.length) {
        for (var j = 0; j < users[i].voips.length; j++) {
          if (users[i].voips[j].type === 'Skype') {
            skype = users[i].voips[j].username;
          }
        }
      }
      out = out +
        '"' + users[i].given_name + '",' +
        '"' + users[i].family_name + '",' +
        '"' + jobTitle + '",' +
        '"' + org + '",' +
        '"' + ' ' + '",' +
        '"' + country + '",' +
        '"' + region + '",' +
        '"' + phoneNumber + '",' +
        '"' + skype + '",' +
        '"' + users[i].email + '",' +
        '"' + status + '"\n';
    }
    return out;
  }

  _findHelper(criteria, options) {
    const FootprintService = this.app.services.FootprintService;
    const User = this.app.orm.User;
    let that = this;
    this.log.debug('[UserController] (find)');
    FootprintService
      .find('user', criteria, options)
      .then((results) => {
        that.log.debug('Counting results');
        return FootprintService
          .count('user', criteria)
          .then((number) => {
            return {results: results, number: number};
          });
      })
      .then((results) => {
        var pop1 = [
          {path: 'organization', select: 'list'},
          {path: 'bundles', match: {deleted: false}, select: 'list'}
        ];
        var pop2 = [
          {path: 'organization.list', model: 'List', select: 'name _id'},
          {path: 'bundles.list', model: 'List', select: 'name _id'}
        ];
        return User
          .populate(results.results, pop1)
          .then((users) => {
            return User
              .populate(users, pop2)
              .then((users2) => {
                return {results: users2, number: results.number};
              });
          });
      })
      .then((results) => {
        if (!results.results) {
          return reply(Boom.notFound());
        }
        for (var i = 0, len = results.results.length; i < len; i++) {
          results.results[i].sanitize(request.params.currentUser);
        }
        if (!request.params.extension) {
          return reply(results.results).header('X-Total-Count', results.number);
        }
        else {
          if (request.params.extension === 'csv') {
            return reply(that._csvExport(results.results))
              .type('text/csv')
              .header('Content-Disposition', 'attachment; filename="Humanitarian ID Contacts ' + moment().format('YYYYMMDD') + '.csv"');
          }
          else if (request.params.extension === 'txt') {
            return reply(that._txtExport(results.results))
              .type('text/plain');
          }
          else if (request.params.extension === 'pdf') {
            that._pdfExport(results.results, request, pdfFormat, function (err, buffer, bytes) {
              if (err) {
                throw err;
              }
              else {
                reply(buffer)
                  .type('application/pdf')
                  .bytes(bytes)
                  .header('Content-Disposition', 'attachment; filename="Humanitarian ID Contacts ' + moment().format('YYYYMMDD') + '.pdf"');
              }
            });
          }
        }
      })
      .catch((err) => { that._errorHandler(err, reply); });
  }

  find (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    let criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    const ListUser = this.app.orm.ListUser,
      List = this.app.orm.List,
      User = this.app.orm.User;
    let lists = [], listIds = [];

    for (var i = 0; i < childAttributes.length; i++) {
      if (criteria[childAttributes[i] + '.list']) {
        listIds.push(criteria[childAttributes[i] + '.list']);
        delete criteria[childAttributes[i] + '.list'];
      }
    }

    // Hide unconfirmed users which are not orphans
    if (request.params.currentUser && !request.params.currentUser.is_admin && !request.params.currentUser.isManager) {
      criteria.$or = [{'email_verified': true}, {'is_orphan': true}, {'is_ghost': true}];
    }

    if (criteria.name) {
      criteria.name = criteria.name.replace(/\(|\\|\^|\.|\||\?|\*|\+|\)|\[|\{/, '');
      criteria.name = new RegExp(criteria.name, 'i');
    }

    if (criteria.country) {
      criteria['location.country.id'] = criteria.country;
      delete criteria.country;
    }

    criteria.deleted = {$in: [false, null]};

    var pdfFormat = '';
    if (criteria.format) {
      pdfFormat = criteria.format;
      delete criteria.format;
    }

    let that = this;

    if (request.params.id || !listIds.length) {
      if (request.params.id) {
        User
          .findOne({_id: request.params.id})
          .then((user) => {
            if (!user) {
              return reply(Boom.notFound());
            }
            else {
              user.sanitize(request.params.currentUser);
              return reply(user);
            }
          })
          .catch((err) => {
            that._errorHandler(err, reply);
          });
      }
      else {
        this._findHelper(criteria, options);
      }
    }
    else {
      let users = [], luCriteria = {};
      List
        .find({_id: {$in: listIds}})
        .then((lists) => {
          async.each(lists, function (list, next) {
            list.isVisibleTo(request.params.currentUser, ListUser, function (out) {
              if (out === true) {
                luCriteria.list = list;
                luCriteria.deleted = false;
                if (!list.isOwner(request.params.currentUser)) {
                  luCriteria.pending = false;
                }
                ListUser
                  .find(luCriteria)
                  .then((lus) => {
                    var tmpUsers = [];
                    for (var i = 0; i < lus.length; i++) {
                      tmpUsers.push(lus[i].user);
                    }
                    users.push(tmpUsers);
                    next();
                  });
              }
              else {
                next();
              }
            });
          }, function (err) {
            if (err) {
              return that._errorHandler(err, reply);
            }
            users.push(String);
            var finalUsers = _.intersectionBy.apply(null, users);
            if (!finalUsers.length) {
              return reply(finalUsers).header('X-Total-Count', 0);
            }
            criteria._id = { $in: finalUsers};
            that._findHelper(criteria, options);
          });
        });
    }
  }

  _updateQuery (request, options) {
    const Model = this.app.orm.user,
      NotificationService = this.app.services.NotificationService;
    return Model
      .update({ _id: request.params.id }, request.payload, {runValidators: true})
      .exec()
      .then(() => {
        return Model
          .findOne({ _id: request.params.id })
          .then((user) => { return user; });
      })
      .then((user) => {
        if (request.params.currentUser._id.toString() !== user._id.toString()) {
          // Notify user of the edit
          // TODO: add list of actions performed by the administrator
          var notification = {type: 'admin_edit', user: user, createdBy: request.params.currentUser};
          NotificationService.send(notification, () => {});
        }
        return user;
      })
      .catch(err => { return Boom.badRequest(err.message); });
  }

  update (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    const Model = this.app.orm.user;

    this.log.debug('[UserController] (update) model = user, criteria =', request.query, request.params.id,
      ', values = ', request.payload);

    this._removeForbiddenAttributes(request);
    if (request.payload.password) {
      delete request.payload.password;
    }

    // Make sure user is verified if he is an admin or a manager
    if (request.payload.is_admin || request.payload.isManager) {
      request.payload.verified = true;
    }

    var that = this;
    if ((request.payload.old_password && request.payload.new_password) || request.payload.verified) {
      this.log.debug('Updating user password or user is verified');
      // Check old password
      Model
        .findOne({_id: request.params.id})
        .then((user) => {
          if (!user) {
            return reply(Boom.notFound());
          }
          // If verifying user, set verified_by
          if (request.payload.verified && !user.verified) {
            request.payload.verified_by = request.params.currentUser._id
          }
          if (request.payload.old_password) {
            if (user.validPassword(request.payload.old_password)) {
              request.payload.password = Model.hashPassword(request.payload.new_password);
              return reply(that._updateQuery(request, options));
            }
            else {
              return reply(Boom.badRequest('The old password is wrong'));
            }
          }
          else {
            return reply(that._updateQuery(request, options));
          }
        })
        .catch(err => { _that.errorHandler(err, reply); });
    }
    else {
      reply(this._updateQuery(request, options));
    }
  }

  destroy (request, reply) {
    const User = this.app.orm.User,
      ListUser = this.app.orm.ListUser;
    this.log.debug('[UserController] (destroy) model = user, query =', request.query);

    var that = this;

    User
      .findOne({ _id: request.params.id })
      .then(record => {
        if (!record) {
          throw new Error(Boom.notFound());
        }
        for (var j = 0; j < childAttributes.length; j++) {
          if (childAttributes[j] === 'organization') {
            record.organization = null;
          }
          else {
            record[childAttributes[j]] = [];
          }
        }
        // Set deleted to true
        record.deleted = true;
        return record
          .save()
          .then(() => {
            return record;
          });
      })
      .then((record) => {
        reply(record);
        // Remove all checkins from this user
        ListUser
          .find({user: request.params.id})
          .populate('list user')
          .then((lus) => {
            var listType = '',
              lu = {};
            for (var i = 0; i < lus.length; i++) {
              // Set listuser to deleted
              lu.deleted = true;
              lu.save();
            }
            return record;
          });
      })
      .then((doc) => {
        // Send notification if user is being deleted by an admin
        if (request.params.currentUser.id !== doc.id) {
          that.app.services.NotificationService.send({type: 'admin_delete', createdBy: request.params.currentUser, user: doc}, () => { });
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  setPrimaryEmail (request, reply) {
    const Model = this.app.orm.user;
    const email = request.payload.email;

    this.log.debug('[UserController] Setting primary email');

    if (!request.payload.email) {
      return reply(Boom.badRequest());
    }

    Model
      .findOne({ _id: request.params.id})
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }
        // Make sure email is validated
        var index = record.emailIndex(email);
        if (index === -1) {
          return reply(Boom.badRequest('Email does not exist'));
        }
        if (!record.emails[index].validated) {
          return reply(Boom.badRequest('Email has not been validated. You need to validate it first.'));
        }
        record.email = email;
        record
          .save()
          .then(() => {
            return reply(record);
          })
          .catch(err => {
            return reply(Boom.badImplementation(err.message));
          });
      });
  }

  validateEmail (request, reply) {
    const Model = this.app.orm.user;
    var parts = {}, email = '';

    this.log.debug('[UserController] Verifying email ');

    if (!request.payload.hash && !request.params.email) {
      return reply(Boom.badRequest());
    }

    // TODO: make sure current user can do this

    if (request.payload.hash) {
      parts = Model.explodeHash(request.payload.hash);
      email = parts.email;
    }
    else {
      email = request.params.email;
    }

    var that = this;
    Model
      .findOne({ 'emails.email': email })
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }
        if (request.payload.hash) {
          // Verify hash
          var valid = record.validHash(request.payload.hash);
          if (valid === true) {
            // Verify user email
            if (record.email === parts.email) {
              record.email_verified = true;
              record.expires = new Date(0, 0, 1, 0, 0, 0);
              record.emails[0].validated = true;
              record.emails.set(0, record.emails[0]);
              record.save().then(() => {
                that.app.services.EmailService.sendPostRegister(record, function (merr, info) {
                  return reply(record);
                });
              })
              .catch(err => { return reply(Boom.badImplementation(err.toString())); });
            }
            else {
              for (var i = 0, len = record.emails.length; i < len; i++) {
                if (record.emails[i].email === parts.email) {
                  record.emails[i].validated = true;
                  record.emails.set(i, record.emails[i]);
                }
              }
              record.save().then((r) => {
                return reply(r);
              })
              .catch(err => { return reply(Boom.badImplementation(err.toString())); });
            }
          }
          else {
            return reply(Boom.badRequest(valid));
          }
        }
        else {
          // Send validation email again
          const app_validation_url = request.payload.app_validation_url;
          that.app.services.EmailService.sendValidationEmail(record, email, app_validation_url, function (err, info) {
            return reply('Validation email sent successfully').code(202);
          })
        }
      })
  }

  resetPassword (request, reply) {
    const Model = this.app.orm['user']
    const app_reset_url = request.payload.app_reset_url

    if (request.payload.email) {
      var that = this
      Model
        .findOne({email: request.payload.email})
        .then(record => {
          if (!record) return that._errorHandler(Boom.badRequest('Email could not be found'), reply)
          that.app.services.EmailService.sendResetPassword(record, app_reset_url, function (merr, info) {
            return reply('Password reset email sent successfully').code(202)
          })
        })
    }
    else {
      if (request.payload.hash && request.payload.password) {
        const parts = Model.explodeHash(request.payload.hash)
        Model
          .findOne({email: parts.email})
          .then(record => {
            if (!record) return reply(Boom.badRequest('Email could not be found'))
            var valid = record.validHash(request.payload.hash)
            if (valid === true) {
              record.password = Model.hashPassword(request.payload.password)
              record.email_verified = true
              record.expires = new Date(0, 0, 1, 0, 0, 0)
              record.save().then(() => {
                return reply('Password reset successfully')
              })
              .catch(err => { return reply(Boom.badImplementation(err.message)) })
            }
            else {
              return reply(Boom.badRequest(valid))
            }
          })
      }
      else {
        return reply(Boom.badRequest('Wrong arguments'));
      }
    }
  }

  claimEmail (request, reply) {
    const Model = this.app.orm['user']
    const app_reset_url = request.payload.app_reset_url
    const userId = request.params.id

    var that = this
    Model
      .findOne({_id: userId})
      .then(record => {
        if (!record) return reply(Boom.notFound())
        that.app.services.EmailService.sendClaim(record, app_reset_url, function (err, info) {
          return reply('Claim email sent successfully').code(202)
        })
      })
  }

  updatePicture (request, reply) {
    const Model = this.app.orm['user']
    const userId = request.params.id

    this.log.debug('[UserController] Updating picture ');

    var data = request.payload;
    if (data.file) {
      Model
        .findOne({_id: userId})
        .then(record => {
          if (!record) return reply(Boom.notFound())
          var ext = data.file.hapi.filename.split('.').pop();
          var path = __dirname + "/../../assets/pictures/" + userId + '.' + ext;
          var file = fs.createWriteStream(path);

          file.on('error', function (err) {
            reply(Boom.badImplementation(err))
          });

          data.file.pipe(file);

          data.file.on('end', function (err) {
            record.picture = process.env.ROOT_URL + "/assets/pictures/" + userId + "." + ext;
            record.save().then(() => {
              return reply(record)
            })
            .catch(err => { return reply(Boom.badImplementation(err.toString())) })
          })
        })
    }
    else {
      return reply(Boom.badRequest('No file found'))
    }
  }

  addEmail (request, reply) {
    const Model = this.app.orm['user']
    const app_validation_url = request.payload.app_validation_url
    const userId = request.params.id

    this.log.debug('[UserController] adding email')
    if (!app_validation_url || !request.payload.email) return reply(Boom.badRequest())

    // Make sure email added is unique
    var that = this
    Model
      .findOne({'emails.email': request.payload.email})
      .then(erecord => {
        if (erecord) return reply(Boom.badRequest('Email is not unique'))
        Model
          .findOne({_id: userId})
          .then(record => {
            if (!record) return reply(Boom.notFound())
            var email = request.payload.email
            if (record.emailIndex(email) != -1) return reply(Boom.badRequest('Email already exists'))
            // Send confirmation email
            that.app.services.EmailService.sendValidationEmail(record, email, app_validation_url, function (err, info) {
              var data = { email: email, type: request.payload.type, validated: false };
              record.emails.push(data);
              record.save().then(() => {
                return reply(record)
              })
              .catch(err => { return reply(Boom.badImplementation(err.toString())) })
            })
          })
      })
  }

  dropEmail (request, reply) {
    const Model = this.app.orm['user']
    const userId = request.params.id

    this.log.debug('[UserController] dropping email')
    if (!request.params.email) return reply(Boom.badRequest())

    var that = this
    Model
      .findOne({_id: userId})
      .then(record => {
        if (!record) return reply(Boom.notFound())
        var email = request.params.email
        if (email == record.email) return reply(Boom.badRequest('You can not remove the primary email'))
        var index = record.emailIndex(email)
        if (index == -1) return reply(Boom.badRequest('Email does not exist'))
        record.emails.splice(index, 1)
        record.save().then(() => {
          return reply(record)
        })
        .catch(err => { return reply(Boom.badImplementation(err.toString())) })
      })
  }

  addPhone (request, reply) {
    const Model = this.app.orm['user']
    const userId = request.params.id

    this.log.debug('[UserController] adding phone number')

    var that = this
    Model
      .findOne({_id: userId})
      .then(record => {
        if (!record) return reply(Boom.notFound())
        var data = { number: request.payload.number, type: request.payload.type };
        record.phone_numbers.push(data);
        record.save().then(() => {
          return reply(record)
        })
        .catch(err => { return reply(Boom.badImplementation(err.toString())) })
      })
  }

  dropPhone (request, reply) {
    const Model = this.app.orm['user']
    const userId = request.params.id
    const phoneId = request.params.pid

    this.log.debug('[UserController] dropping phone number')

    var that = this
    Model
      .findOne({_id: userId})
      .then(record => {
        if (!record) return reply(Boom.notFound())
        var index = -1
        for (var i = 0, len = record.phone_numbers.length; i < len; i++) {
          if (record.phone_numbers[i]._id == phoneId) {
            index = i
          }
        }
        if (index == -1) return reply(Boom.notFound())
        // Do not allow deletion of primary phone number
        if (record.phone_numbers[index].number == record.phone_number) return reply(Boom.badRequest('Can not remove primary phone number'))
        record.phone_numbers.splice(index, 1)
        record.save().then(() => {
          return reply(record)
        })
        .catch(err => { return reply(Boom.badImplementation(err.toString())) })
      })
  }

  setPrimaryPhone (request, reply) {
    const Model = this.app.orm.user;
    const phone = request.payload.phone;
    let that = this;

    this.log.debug('[UserController] Setting primary phone number');

    if (!request.payload.phone) return reply(Boom.badRequest())
    Model
      .findOne({ _id: request.params.id})
      .then(record => {
        if (!record) return reply(Boom.notFound())
        // Make sure phone is part of phone_numbers
        var index = -1
        for (var i = 0, len = record.phone_numbers.length; i < len; i++) {
          if (record.phone_numbers[i].number == phone) {
            index = i
          }
        }
        if (index == -1) return reply(Boom.badRequest('Phone does not exist'))
        record.phone_number = record.phone_numbers[index].number
        record.phone_number_type = record.phone_numbers[index].type
        record.save().then(() => {
          return reply(record)
        })
        .catch(err => { that._errorHandler(err, reply); })
      })
  }

  setPrimaryOrganization (request, reply) {
    const User = this.app.orm.user,
      ListUser = this.app.orm.ListUser;
    if (!request.payload._id) {
      return reply(Boom.badRequest('Missing listUser id'));
    }
    let that = this;
    ListUser
      .findOne({ _id: request.payload._id})
      .populate('list user')
      .then(record => {
        if (!record || record.list.type !== 'organization' || !record.user._id.equals(request.params.id)) {
          return reply(Boom.badRequest());
        }
        // Make sure listUser is part of organizations
        var index = -1;
        for (var i = 0; i < record.user.organizations.length; i++) {
          if (record.user.organizations[i]._id.toString() === request.payload._id) {
            index = i;
          }
        }
        if (index === -1) {
          return reply(Boom.badRequest('Organization should be part of user organizations'));
        }
        record.user.organization = record._id;
        record.user.save().then(() => {
          // Return a populated user
          User
            .findOne({_id: record.user._id})
            .then((user) => {
              return reply(user);
            });
        });
      })
      .catch (err => { that._errorHandler(err, reply); });

  }

  showAccount (request, reply) {
    reply(request.params.currentUser)
  }

  notify (request, reply) {
    const Model = this.app.orm['user']

    this.log.debug('[UserController] Notifying user')

    var that = this
    Model
      .findOne({ _id: request.params.id})
      .then(record => {
        if (!record) return reply(Boom.notFound())

        var notPayload = {
          type: 'contact_needs_update',
          createdBy: request.params.currentUser,
          user: record
        };
        that.app.services.NotificationService.send(notPayload, function (out) {
          return reply(out)
        })
      })
  }

}
