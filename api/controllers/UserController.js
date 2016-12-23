'use strict';

const Controller = require('trails-controller');
const Boom = require('boom');
const Bcrypt = require('bcryptjs');
const fs = require('fs');
const ejs = require('ejs');
const moment = require('moment');
const async = require('async');
const _ = require('lodash');
const childAttributes = ['lists', 'organization', 'organizations', 'operations', 'bundles', 'disasters'];

/**
 * @module UserController
 * @description Generated Trails.js Controller.
 */
module.exports = class UserController extends Controller{

  _getAdminOnlyAttributes () {
    return this._getSchemaAttributes('adminOnlyAttributes', 'adminOnly');
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
    if (!request.params.currentUser || !request.params.currentUser.is_admin) {
      forbiddenAttributes = childAttributes.concat(this._getReadonlyAttributes(), this._getAdminOnlyAttributes());
    }
    else {
      forbiddenAttributes = childAttributes.concat(this._getReadonlyAttributes());
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

    if (request.params.currentUser) {
      request.payload.createdBy = request.params.currentUser._id;
    }
    // If an orphan is being created, do not expire
    if (request.params.currentUser && registrationType === '') {
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

    // Makes sure only admins or anonymous users can create users
    if (request.params.currentUser && !request.params.currentUser.is_admin) {
      return reply(Boom.forbidden('You need to be an administrator'));
    }

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
      // Create user
      that._createHelper(request, reply);
    }
  }

  _pdfExport (data, req, callback) {
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
    data.lists.forEach(function (list) {
      filters.push(list.name);
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
    if (req.query.hasOwnProperty('format') && req.query.format === 'meeting-compact') {
      template = 'templates/pdf/printMeetingCompact.html';
    }
    if (req.query.hasOwnProperty('format') && req.query.format === 'meeting-comfortable') {
      template = 'templates/pdf/printMeetingComfortable.html';
    }
    ejs.renderFile(template, data, {}, callback);
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

  find (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    let criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    const ListUser = this.app.orm.ListUser,
      List = this.app.orm.List;
    let lists = [];

    for (var i = 0; i < childAttributes.length; i++) {
      if (criteria[childAttributes[i] + '.list']) {
        lists.push(criteria[childAttributes[i] + '.list']);
        delete criteria[childAttributes[i] + '.list'];
      }
    }

    // Hide unconfirmed users
    if (request.params.currentUser && !request.params.currentUser.is_admin) {
      criteria.email_verified = true;
    }

    if (criteria['roles.id']) {
      criteria['roles.id'] = parseInt(criteria['roles.id']);
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

    let that = this;

    if (request.params.id || !lists.length) {
      if (request.params.id) {
        criteria = request.params.id;
      }
      this.log.debug('[UserController] (find) criteria =', criteria, 'options =', options);
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
          if (!results.results) {
            return reply(Boom.notFound());
          }
          if (request.params.id) {
            results.results.sanitize();
          }
          else {
            for (var i = 0, len = results.results.length; i < len; i++) {
              results.results[i].sanitize();
            }
          }
          if (!request.params.extension) {
            return reply(results.results).header('X-Total-Count', results.number);
          }
          else {
            if (request.params.extension === 'csv') {
              return reply(that._csvExport(results.results))
                .type('text/csv');
            }
            else if (request.params.extension === 'txt') {
              return reply(that._txtExport(results.results))
                .type('text/plain');
            }
            else if (request.params.extension === 'pdf') {
              that._pdfExport(results.results, request, function (err, str) {
                reply(str)
                  .type('text/html');
              });
            }
          }
        })
        .catch((err) => { that._errorHandler(err, reply); });
    }
    else {
      let users = [];
      async.each(lists, function (list, next) {
        ListUser
          .find({list: list, deleted: criteria.deleted})
          .then((lus) => {
            var tmpUsers = [];
            for (var i = 0; i < lus.length; i++) {
              tmpUsers.push(lus[i].user);
            }
            users.push(tmpUsers);
            next();
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
        that.log.debug('[UserController] (find) criteria =', criteria, 'options =', options);
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
            that.log.debug('Retrieving list data');
            return List
              .find({_id: { $in: lists } })
              .then((lists) => {
                results.lists = lists;
                return results;
              });
          })
          .then((results) => {
            if (!results.results) {
              return reply(Boom.notFound());
            }
            for (var i = 0, len = results.results.length; i < len; i++) {
              results.results[i].sanitize();
            }
            if (!request.params.extension) {
              return reply(results.results).header('X-Total-Count', results.number);
            }
            else {
              if (request.params.extension === 'csv') {
                return reply(that._csvExport(results.results))
                  .type('text/csv');
              }
              else if (request.params.extension === 'txt') {
                return reply(that._txtExport(results.results))
                  .type('text/plain');
              }
              else if (request.params.extension === 'pdf') {
                that._pdfExport(results, request, function (err, str) {
                  if (err) {
                    throw err;
                  }
                  reply(str)
                    .type('text/html');
                });
              }
            }
          })
          .catch(err => { that._errorHandler(err, reply); });
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

  checkin (request, reply) {
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const userId = request.params.id;
    const childAttribute = request.params.childAttribute;
    const payload = request.payload;
    const Model = this.app.orm.user;
    const List = this.app.orm.list,
      ListUser = this.app.orm.ListUser;

    this.log.debug('[UserController] (checkin) user ->', childAttribute, ', payload =', payload,
      'options =', options);

    if (childAttributes.indexOf(childAttribute) === -1 || childAttribute === 'organization') {
      return reply(Boom.notFound());
    }

    // Make sure there is a list in the payload
    if (!payload.list) {
      return reply(Boom.badRequest('Missing list attribute'));
    }

    const that = this;

    List
      .findOne({ '_id': payload.list })
      .then((list) => {
        // Check that the list added corresponds to the right attribute
        if (childAttribute !== list.type + 's' && childAttribute !== list.type) {
          throw new Boom.badRequest('Wrong list type');
        }

        //Set the proper pending attribute depending on list type
        if (list.joinability === 'public' || list.joinability === 'private') {
          payload.pending = false;
        }
        else {
          payload.pending = true;
        }

        that.log.debug('Looking for user with id ' + userId);
        return Model
          .findOne({ '_id': userId })
          .then((record) => {
            if (!record) {
              throw new Boom.badRequest('User not found');
            }
            return {list: list, user: record};
          });
      })
      .then((result) => {
        // TODO: make sure user is allowed to join this list
        that.log.debug('Saving new checkin');
        payload.user = result.user._id;
        return ListUser
          .create(payload)
          .then((lu) => {
            return {list: result.list, user: result.user, listUser: lu};
          });
      })
      .then((result) => {
        that.log.debug('Setting the listUser to the correct attribute');
        var record = result.user,
          list = result.list;
        if (childAttribute !== 'organization') {
          if (!record[childAttribute]) {
            record[childAttribute] = [];
          }

          // Make sure user is not already checked in this list
          for (var i = 0, len = record[childAttribute].length; i < len; i++) {
            if (record[childAttribute][i].list.equals(list._id)) {
              throw new Boom.badRequest('User is already checked in');
            }
          }

          record[childAttribute].push(result.listUser);
        }
        else {
          record.organization = result.listUser;
        }
        return {list: result.list, user: record, listUser: result.listUser};
      })
      .then((result) => {
        that.log.debug('Saving user');
        var user = result.user;
        return user
          .save()
          .then(() => {
            that.log.debug('Done saving user');
            return Model
              .findOne({_id: user._id})
              .then((user2) => {
                result.user = user2;
                return result;
              });
          });
      })
      .then((result) => {
        reply(result.user);
        // Notify list managers of the checkin
        that.app.services.NotificationService.notifyMultiple(result.list.managers, {
          type: 'checkin',
          createdBy: result.user,
          params: { list: result.list }
        });
        return result;
      })
      .then((result) => {
        // Notify user if needed
        if (request.params.currentUser.id !== userId) {
          that.log.debug('Checked in by a different user');
          that.app.services.NotificationService.send({
            type: 'admin_checkin',
            createdBy: request.params.currentUser,
            user: user,
            params: { list: result.list }
          }, () => { });
        }
        return result;
      })
      .then((result) => {
        // Notify list owner and managers of the new checkin if needed
        var list = result.list,
          user = result.user;
        if (payload.pending) {
          that.log.debug('Notifying list owners and manager of the new checkin');
          that.app.services.NotificationService.sendMultiple(list.managers, {
            type: 'pending_checkin',
            params: { list: list, user: user }
          }, () => { });
        }
      })
      .catch(err => { that._errorHandler(err, reply); });
  }

  checkout (request, reply) {
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const userId = request.params.id;
    const childAttribute = request.params.childAttribute;
    const checkInId = request.params.checkInId;
    const payload = request.payload;
    const Model = this.app.orm.user;
    const FootprintService = this.app.services.FootprintService;
    const List = this.app.orm.List;
    const ListUser = this.app.orm.ListUser;

    this.log.debug('[UserController] (checkout) user ->', childAttribute, ', payload =', payload,
      'options =', options);

    if (childAttributes.indexOf(childAttribute) === -1) {
      return this._errorHandler(Boom.notFound(), reply);
    }

    var that = this;
    var query = ListUser
      .findOne({ _id: checkInId })
      .populate('list user')
      .then(record => {
        if (!record) {
          throw new Error(Boom.notFound());
        }
        // Set deleted to true
        record.deleted = true;
        return record
          .save()
          .then(() => {
            return record;
          });
      })
      .then((result) => {
        var listType = result.list.type,
          user = result.user,
          found = false;
        for (var i = 0; i < user[listType + 's'].length; i++) {
          if (user[listType + 's'][i]._id.toString() === checkInId) {
            found = i;
          }
        }
        // Remove reference to checkin
        user[listType + 's'].splice(found, 1);
        return user
          .save()
          .then(() => {
            return result;
          });
      })
      .then((result) => {
        reply(result.user);
        // Send notification if needed
        if (request.params.currentUser.id !== userId) {
          that.app.services.NotificationService.send({
            type: 'admin_checkout',
            createdBy: request.params.currentUser,
            user: result.user,
            params: { list: result.list }
          }, () => { });
        }
        return result;
      })
      .then((result) => {
        // Notify list managers of the checkin
        that.app.services.NotificationService.notifyMultiple(result.list.managers, {
          type: 'checkout',
          createdBy: result.user,
          params: { list: result.list }
        });
        return result;
      })
      .catch(err => { that._errorHandler(err, reply); });
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
