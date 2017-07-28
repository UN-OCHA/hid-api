'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const fs = require('fs');
const qs = require('qs');
const ejs = require('ejs');
const http = require('http');
const moment = require('moment');
const acceptLanguage = require('accept-language');
const appResetUrls = [
  'https://humanitarian.id/reset_password',
  'https://auth.humanitarian.id/new_password',
  'https://app2.dev.humanitarian.id/reset_password',
  'https://api2.dev.humanitarian.id/new_password'
];

/**
 * @module UserController
 * @description Generated Trails.js Controller.
 */
module.exports = class UserController extends Controller{

  _removeForbiddenAttributes (request) {
    const childAttributes = this.app.orm.User.listAttributes();
    this.app.services.HelperService.removeForbiddenAttributes('User', request, childAttributes);
  }

  _errorHandler (err, request, reply) {
    return this.app.services.ErrorService.handle(err, request, reply);
  }

  _createHelper(request, reply) {
    const Model = this.app.orm.User;
    const UserModel = this.app.models.User;

    this.log.debug('Preparing request for user creation', { request: request });

    if (request.payload.email) {
      request.payload.emails = [];
      request.payload.emails.push({type: 'Work', email: request.payload.email, validated: false});
    }

    if (request.payload.password && request.payload.confirm_password) {
      if (!UserModel.isStrongPassword(request.payload.password)) {
        return reply(Boom.badRequest('The password is not strong enough'));
      }
      request.payload.password = UserModel.hashPassword(request.payload.password);
    }
    else {
      // Set a random password
      request.payload.password = UserModel.hashPassword(UserModel.generateRandomPassword());
    }

    const appVerifyUrl = request.payload.app_verify_url;
    delete request.payload.app_verify_url;

    let registrationType = '';
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
      if (request.payload.email) {
        request.payload.is_orphan = true;
      }
      else {
        request.payload.is_ghost = true;
      }
    }

    const that = this;
    Model
      .create(request.payload)
      .then((user) => {
        if (!user) {
          throw Boom.badRequest();
        }
        that.log.debug('User ' + user._id.toString() + ' successfully created', { request: request });

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
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  create (request, reply) {
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const Model = this.app.orm.user;

    this.log.debug('[UserController] (create) payload =', request.payload, 'options =', options, { request: request });

    if (!request.payload.app_verify_url) {
      return reply(Boom.badRequest('Missing app_verify_url'));
    }

    const that = this;
    if (request.payload.email) {
      Model
        .findOne({'emails.email': request.payload.email})
        .then((record) => {
          if (!record) {
            // Create user
            that._createHelper(request, reply);
          }
          else {
            if (!request.params.currentUser) {
              if (record.deleted) {
                // Unverify user, reactivate account and return it
                record.email_verified = false;
                record.deleted = false;
                record.save().then(() => {
                  const appVerifyUrl = request.payload.app_verify_url;
                  that.app.services.EmailService.sendRegister(record, appVerifyUrl, function (merr, info) {
                    return reply(record);
                  });
                });
              }
              else {
                return reply(Boom.badRequest('This email address is already registered. If you can not remember your password, please reset it'));
              }
            }
            else {
              // User is being "reactivated" by someone else
              // Make sure it shows up in the HID app
              record.authOnly = false;
              record.save().then(() => {
                return reply(record);
              });
            }
          }
        })
        .catch(err => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
    else {
      // Create ghost user
      that._createHelper(request, reply);
    }
  }

  // TODO: remove after HPC fixes their app to use v2 API
  registerV1 (request, reply) {
    this.log.debug('registerV1 called', { request: request });
    const User = this.app.orm.User;
    const UserModel = this.app.models.User;
    const that = this;

    User
      .findOne({email: request.payload.email})
      .then((user) => {
        if (user) {
          return reply({status: 'ok', data: {user_id: user.user_id, is_new: 0}});
        }
        if (request.payload.email) {
          request.payload.emails = [];
          request.payload.emails.push({type: 'Work', email: request.payload.email, validated: false});
        }
        // Set a random password
        request.payload.password = UserModel.hashPassword(UserModel.generateRandomPassword());
        // Create the account
        return User
          .create({
            email: request.payload.email,
            given_name: request.payload.nameFirst,
            family_name: request.payload.nameLast,
            password: request.payload.password,
            emails: request.payload.emails
          });
      })
      .then(user => {
        // Find admin user
        return User
          .findOne({'emails.email': request.payload.adminEmail})
          .then(admin => {
            return {user: user, admin: admin};
          });
      })
      .then(users => {
        // Send invitation
        that.app.services.EmailService.sendRegisterOrphan(
          users.user,
          users.admin,
          'https://auth.humanitarian.id/new_password',
          function (merr, info) {
            return reply({status: 'ok', data: {user_id: users.user.user_id, is_new: 1}});
          }
        );
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  _pdfExport (data, req, format, callback) {
    const filters = [];
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

    data.dateGenerated = moment().format('LL');
    data.filters = filters;
    let template = 'templates/pdf/printList.html';
    if (format === 'meeting-compact') {
      template = 'templates/pdf/printMeetingCompact.html';
    }
    else if (format === 'meeting-comfortable') {
      template = 'templates/pdf/printMeetingComfortable.html';
    }
    ejs.renderFile(template, data, {}, function (err, str) {
      if (err) {
        callback(err);
      }
      else {
        const postData = qs.stringify({
            'html': str
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
          };

        // Send the HTML to the wkhtmltopdf service to generate a PDF, and
        // return the output.
        const clientReq = http.request(options, function(clientRes) {
          if (clientRes && clientRes.statusCode === 200) {
            clientRes.setEncoding('binary');

            const pdfSize = parseInt(clientRes.headers['content-length']),
              pdfBuffer = new Buffer(pdfSize);
            let bytes = 0;

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
      }
    });
  }

  _txtExport (users) {
    let out = '';
    for (let i = 0; i < users.length; i++) {
      out += users[i].name + ' <' + users[i].email + '>,';
    }
    return out;
  }

  _csvExport (users) {
    let out = 'Given Name,Family Name,Job Title,Organization,Groups,Country,Admin Area,Phone,Skype,Email,Notes\n',
      org = '',
      bundles = '',
      country = '',
      region = '',
      jobTitle = '',
      phoneNumber = '',
      skype = '',
      status = '';
    for (let i = 0; i < users.length; i++) {
      org = '';
      bundles = '';
      country = '';
      region = '';
      skype = '';
      jobTitle = users[i].job_title || ' ';
      phoneNumber = users[i].phone_number || ' ';
      status = users[i].status || ' ';
      if (users[i].organization && users[i].organization.list) {
        org = users[i].organization.name;
      }
      if (users[i].bundles && users[i].bundles.length) {
        users[i].bundles.forEach(function (bundle) {
          bundles += bundle.name + ';';
        });
      }
      if (users[i].location && users[i].location.country) {
        country = users[i].location.country.name;
      }
      if (users[i].location && users[i].location.region) {
        region = users[i].location.region.name;
      }
      if (users[i].voips.length) {
        for (let j = 0; j < users[i].voips.length; j++) {
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
        '"' + bundles + '",' +
        '"' + country + '",' +
        '"' + region + '",' +
        '"' + phoneNumber + '",' +
        '"' + skype + '",' +
        '"' + users[i].email + '",' +
        '"' + status + '"\n';
    }
    return out;
  }

  _findHelper(request, reply, criteria, options, lists) {
    const User = this.app.orm.User;
    const reqLanguage = acceptLanguage.get(request.headers['accept-language']);
    let pdfFormat = '';
    if (criteria.format) {
      pdfFormat = criteria.format;
      delete criteria.format;
    }

    const that = this;
    this.log.debug('[UserController] (find) criteria = ', criteria, ' options = ', options, { request: request });
    const query = this.app.services.HelperService.find('User', criteria, options);
    query
      .then((results) => {
        return User
          .count(criteria)
          .then((number) => {
            return {results: results, number: number};
          });
      })
      .then((results) => {
        if (!results.results) {
          return reply(Boom.notFound());
        }
        for (let i = 0, len = results.results.length; i < len; i++) {
          results.results[i].sanitize(request.params.currentUser);
          results.results[i].translateListNames(reqLanguage);
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
            results.lists = lists;
            that._pdfExport(results, request, pdfFormat, function (err, buffer, bytes) {
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
      .catch((err) => {
        that._errorHandler(err, request, reply);
      });
  }

  find (request, reply) {
    const reqLanguage = acceptLanguage.get(request.headers['accept-language']);
    const User = this.app.orm.User;
    const that = this;

    if (request.params.id) {
      const criteria = {_id: request.params.id, deleted: false};
      if (!request.params.currentUser.verified) {
        criteria.is_orphan = false;
        criteria.is_ghost = false;
      }
      User
        .findOne(criteria)
        .then((user) => {
          if (!user) {
            return reply(Boom.notFound());
          }
          else {
            user.sanitize(request.params.currentUser);
            user.translateListNames(reqLanguage);
            return reply(user);
          }
        })
        .catch((err) => {
          that._errorHandler(err, request, reply);
        });
    }
    else {
      const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
      const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);
      const List = this.app.orm.List;
      const childAttributes = User.listAttributes();

      // Hide unconfirmed users which are not orphans
      if (request.params.currentUser && !request.params.currentUser.is_admin && !request.params.currentUser.isManager) {
        criteria.$or = [{'email_verified': true}, {'is_orphan': true}, {'is_ghost': true}];
      }

      if (criteria.name) {
        if (criteria.name.length < 3) {
          return reply(Boom.badRequest('Name must have at least 3 characters'));
        }
        criteria.name = criteria.name.replace(/([^a-z0-9 ]+)/gi, '-');
        criteria.name = new RegExp(criteria.name, 'i');
      }

      if (criteria.country) {
        criteria['location.country.id'] = criteria.country;
        delete criteria.country;
      }

      criteria.deleted = false;
      if (!request.params.currentUser.verified) {
        criteria.is_orphan = false;
        criteria.is_ghost = false;
      }
      const listIds = [];
      for (let i = 0; i < childAttributes.length; i++) {
        if (criteria[childAttributes[i] + '.list']) {
          listIds.push(criteria[childAttributes[i] + '.list']);
          delete criteria[childAttributes[i] + '.list'];
        }
      }
      if (!listIds.length) {
        this._findHelper(request, reply, criteria, options, listIds);
      }
      else {
        List
          .find({_id: { $in: listIds}})
          .then((lists) => {
            lists.forEach(function (list) {
              if (list.isVisibleTo(request.params.currentUser)) {
                criteria[list.type + 's'] = {$elemMatch: {list: list._id, deleted: false}};
                if (!list.isOwner(request.params.currentUser)) {
                  criteria[list.type + 's'].$elemMatch.pending = false;
                }
              }
              else {
                throw Boom.unauthorized('You are not authorized to view this list');
              }
            });
            return lists;
          })
          .then((lists) => {
            that._findHelper(request, reply, criteria, options, lists);
          })
          .catch(err => {
            that._errorHandler(err, request, reply);
          });
      }
    }
  }

  // TODO: remove after HPC fixes their app to use new API
  findV1 (request, reply) {
    this.log.debug('findV1 called', { request: request });
    const User = this.app.orm.User;
    const that = this;
    User
      .findOne({'emails.email': request.payload.email})
      .then((user) => {
        return reply(user);
      })
      .catch((err) => { that._errorHandler(err, request, reply); });
  }

  _updateQuery (request, options) {
    const Model = this.app.orm.user,
      NotificationService = this.app.services.NotificationService,
      EmailService = this.app.services.EmailService,
      that = this;
    return Model
      .findOneAndUpdate({ _id: request.params.id }, request.payload, {runValidators: true, new: true})
      .exec()
      .then((user) => {
        return user
          .defaultPopulate()
          .then(user => {
            if (request.params.currentUser._id.toString() !== user._id.toString()) {
              // User is being edited by someone else
              // If it's an auth account, surface it
              if (user.authOnly) {
                user.authOnly = false;
                user
                  .save()
                  .then(() => {
                    EmailService.sendAuthToProfile(user, request.params.currentUser, () => {});
                  });
              }
              else {
                // Notify user of the edit
                const notification = {type: 'admin_edit', user: user, createdBy: request.params.currentUser};
                NotificationService.send(notification, () => {});
              }
            }
            return user;
          });
      })
      .catch(err => {
        that.log.error(err);
        return Boom.badRequest(err.message);
      });
  }

  update (request, reply) {
    const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
    const Model = this.app.orm.user;
    const UserModel = this.app.models.User;

    this.log.debug('[UserController] (update) model = user, criteria =', request.query, request.params.id,
      ', values = ', request.payload, { request: request });

    this._removeForbiddenAttributes(request);
    if (request.payload.password) {
      delete request.payload.password;
    }

    // Make sure user is verified if he is an admin or a manager
    if (request.payload.is_admin || request.payload.isManager) {
      request.payload.verified = true;
    }

    const that = this;
    if ((request.payload.old_password && request.payload.new_password) || request.payload.verified) {
      this.log.debug('Updating user password or user is verified', { request: request });
      // Check old password
      Model
        .findOne({_id: request.params.id})
        .then((user) => {
          if (!user) {
            return reply(Boom.notFound());
          }
          // If verifying user, set verified_by
          if (request.payload.verified && !user.verified) {
            request.payload.verified_by = request.params.currentUser._id;
          }
          if (request.payload.old_password) {
            that.log.warn('Updating user password', { request: request, security: true});
            if (user.validPassword(request.payload.old_password)) {
              if (!UserModel.isStrongPassword(request.payload.new_password)) {
                that.log.warn('Could not update user password. New password is not strong enough', { request: request, security: true, fail: true});
                return reply(Boom.badRequest('Password is not strong enough'));
              }
              request.payload.password = UserModel.hashPassword(request.payload.new_password);
              that.log.warn('Successfully updated user password', { request: request, security: true});
              return reply(that._updateQuery(request, options));
            }
            else {
              that.log.warn('Could not update user password. Old password is wrong', { request: request, security: true, fail: true});
              return reply(Boom.badRequest('The old password is wrong'));
            }
          }
          else {
            return reply(that._updateQuery(request, options));
          }
        })
        .catch(err => {
          that.errorHandler(err, reply);
        });
    }
    else {
      if (!request.payload.verified) {
        request.payload.verified_by = null;
      }
      reply(this._updateQuery(request, options));
    }
  }

  destroy (request, reply) {
    const User = this.app.orm.User;
    this.log.debug('[UserController] (destroy) model = user, query =', request.query, { request: request });

    const that = this;

    User
      .remove({ _id: request.params.id })
      .then(() => {
        return reply().code(204);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  setPrimaryEmail (request, reply) {
    const Model = this.app.orm.user;
    const email = request.payload.email;

    this.log.debug('[UserController] Setting primary email', { request: request });

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
        const index = record.emailIndex(email);
        if (index === -1) {
          return reply(Boom.badRequest('Email does not exist'));
        }
        if (!record.emails[index].validated) {
          return reply(Boom.badRequest('Email has not been validated. You need to validate it first.'));
        }
        record.email = email;
        // If we are there, it means that the email has been validated, so make sure email_verified is set to true.
        record.email_verified = true;
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
    let parts = {}, email = '';

    this.log.debug('[UserController] Verifying email ', { request: request });

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

    const that = this;
    Model
      .findOne({ 'emails.email': email })
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }
        if (request.payload.hash) {
          // Verify hash
          if (record.validHash(request.payload.hash)) {
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
              .catch(err => {
                that._errorHandler(err, request, reply);
              });
            }
            else {
              for (let i = 0, len = record.emails.length; i < len; i++) {
                if (record.emails[i].email === parts.email) {
                  record.emails[i].validated = true;
                  record.emails.set(i, record.emails[i]);
                }
              }
              record.save().then((r) => {
                return reply(r);
              })
              .catch(err => {
                that._errorHandler(err, request, reply);
              });
            }
          }
          else {
            return reply(Boom.badRequest('Invalid hash'));
          }
        }
        else {
          // Send validation email again
          const appValidationUrl = request.payload.app_validation_url;
          that.app.services.EmailService.sendValidationEmail(record, email, appValidationUrl, function (err, info) {
            return reply('Validation email sent successfully').code(202);
          });
        }
      });
  }

  resetPassword (request, reply) {
    const Model = this.app.orm.User;
    const UserModel = this.app.models.User;
    const appResetUrl = request.payload.app_reset_url;
    const that = this;

    if (appResetUrls.indexOf(appResetUrl) === -1) {
      this.log.warn('Invalid app_reset_url', { security: true, fail: true, request: request});
      return reply(Boom.badRequest('app_reset_url is invalid'));
    }

    if (request.payload.email) {
      Model
        .findOne({email: request.payload.email.toLowerCase()})
        .then(record => {
          if (!record) {
            return that._errorHandler(Boom.badRequest('Email could not be found'), request, reply);
          }
          that.app.services.EmailService.sendResetPassword(record, appResetUrl, function (merr, info) {
            return reply('Password reset email sent successfully').code(202);
          });
        });
    }
    else {
      if (request.payload.hash && request.payload.password) {
        this.log.warn('Resetting password', { security: true, request: request});
        const parts = Model.explodeHash(request.payload.hash);
        Model
          .findOne({email: parts.email})
          .then(record => {
            if (!record) {
              that.log.warn('Could not reset password. Email not found', { security: true, fail: true, request: request});
              return reply(Boom.badRequest('Email could not be found'));
            }
            if (record.validHash(request.payload.hash)) {
              if (!UserModel.isStrongPassword(request.payload.password)) {
                that.log.warn('Could not reset password. New password is not strong enough.', { security: true, fail: true, request: request});
                return reply(Boom.badRequest('New password is not strong enough'));
              }
              record.password = UserModel.hashPassword(request.payload.password);
              record.email_verified = true;
              record.expires = new Date(0, 0, 1, 0, 0, 0);
              record.is_orphan = false;
              record.save().then(() => {
                that.log.warn('Password updated successfully', { security: true, request: request});
                return reply('Password reset successfully');
              })
              .catch(err => {
                that._errorHandler(err, request, reply);
              });
            }
            else {
              return reply(Boom.badRequest('Invalid hash'));
            }
          });
      }
      else {
        return reply(Boom.badRequest('Wrong arguments'));
      }
    }
  }

  claimEmail (request, reply) {
    const Model = this.app.orm.User;
    const appResetUrl = request.payload.app_reset_url;
    const userId = request.params.id;

    const that = this;
    Model
      .findOne({_id: userId})
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }
        that.app.services.EmailService.sendClaim(record, appResetUrl, function (err, info) {
          return reply('Claim email sent successfully').code(202);
        });
      });
  }

  updatePicture (request, reply) {
    const Model = this.app.orm.User;
    const userId = request.params.id;
    const that = this;

    this.log.debug('[UserController] Updating picture ', { request: request });

    const data = request.payload;
    if (data.file) {
      Model
        .findOne({_id: userId})
        .then(record => {
          if (!record) {
            return reply(Boom.notFound());
          }
          const ext = data.file.hapi.filename.split('.').pop();
          const mimeType = data.file.hapi.headers['content-type'];
          if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
            return reply(Boom.badRequest('Only jpg, jpeg or png extensions allowed'));
          }
          // Avoid files with any extension
          if (ext !== 'jpg' && ext !== 'jpeg' && ext !== 'png') {
            return reply(Boom.badRequest('Only jpg, jpeg or png extensions allowed'));
          }
          const path = __dirname + '/../../assets/pictures/' + userId + '.' + ext;
          const file = fs.createWriteStream(path);

          file.on('error', function (err) {
            that._errorHandler(err, request, reply);
          });

          data.file.pipe(file);

          data.file.on('end', function (err) {
            record.picture = process.env.ROOT_URL + '/assets/pictures/' + userId + '.' + ext;
            record.save().then(() => {
              return reply(record);
            })
            .catch(err => {
              that._errorHandler(err, request, reply);
            });
          });
        }
      );
    }
    else {
      return reply(Boom.badRequest('No file found'));
    }
  }

  addEmail (request, reply) {
    const Model = this.app.orm.User;
    const appValidationUrl = request.payload.app_validation_url;
    const userId = request.params.id;

    this.log.debug('[UserController] adding email', { request: request});
    if (!appValidationUrl || !request.payload.email) {
      return reply(Boom.badRequest());
    }

    // Make sure email added is unique
    const that = this;
    Model
      .findOne({'emails.email': request.payload.email})
      .then(erecord => {
        if (erecord) {
          return reply(Boom.badRequest('Email is not unique'));
        }
        Model
          .findOne({_id: userId})
          .then(record => {
            if (!record) {
              return reply(Boom.notFound());
            }
            const email = request.payload.email;
            if (record.emailIndex(email) !== -1) {
              return reply(Boom.badRequest('Email already exists'));
            }
            // Send confirmation email
            that.app.services.EmailService.sendValidationEmail(record, email, appValidationUrl, function (err, info) {
              if (err) {
                return that._errorHandler(err, request, reply);
              }
              else {
                const data = { email: email, type: request.payload.type, validated: false };
                record.emails.push(data);
                record.save().then(() => {
                  return reply(record);
                })
                .catch(err => {
                  that._errorHandler(err, request, reply);
                });
              }
            });
          }
        );
      }
    );
  }

  dropEmail (request, reply) {
    const Model = this.app.orm.User;
    const userId = request.params.id;
    const that = this;

    this.log.debug('[UserController] dropping email', { request: request });
    if (!request.params.email) {
      return reply(Boom.badRequest());
    }

    Model
      .findOne({_id: userId})
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }
        const email = request.params.email;
        if (email === record.email) {
          return reply(Boom.badRequest('You can not remove the primary email'));
        }
        const index = record.emailIndex(email);
        if (index === -1) {
          return reply(Boom.badRequest('Email does not exist'));
        }
        record.emails.splice(index, 1);
        record.save().then(() => {
          return reply(record);
        })
        .catch(err => {
          that._errorHandler(err, request, reply);
        });
      }
    );
  }

  addPhone (request, reply) {
    const Model = this.app.orm.User;
    const userId = request.params.id;
    const that = this;

    this.log.debug('[UserController] adding phone number', { request: request });

    Model
      .findOne({_id: userId})
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }
        const data = { number: request.payload.number, type: request.payload.type };
        record.phone_numbers.push(data);
        record.save().then(() => {
          return reply(record);
        })
        .catch(err => {
          that._errorHandler(err, request, reply);
        });
      }
    );
  }

  dropPhone (request, reply) {
    const Model = this.app.orm.User;
    const userId = request.params.id;
    const phoneId = request.params.pid;
    const that = this;

    this.log.debug('[UserController] dropping phone number', { request: request });

    Model
      .findOne({_id: userId})
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }
        let index = -1;
        for (let i = 0, len = record.phone_numbers.length; i < len; i++) {
          if (record.phone_numbers[i]._id === phoneId) {
            index = i;
          }
        }
        if (index === -1) {
          return reply(Boom.notFound());
        }
        // Do not allow deletion of primary phone number
        if (record.phone_numbers[index].number === record.phone_number) {
          return reply(Boom.badRequest('Can not remove primary phone number'));
        }
        record.phone_numbers.splice(index, 1);
        record
          .save()
          .then(() => {
            return reply(record);
          })
          .catch(err => {
            that._errorHandler(err, request, reply);
          }
        );
      }
    );
  }

  setPrimaryPhone (request, reply) {
    const Model = this.app.orm.user;
    const phone = request.payload.phone;
    const that = this;

    this.log.debug('[UserController] Setting primary phone number', { request: request });

    if (!request.payload.phone) {
      return reply(Boom.badRequest());
    }
    Model
      .findOne({ _id: request.params.id})
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }
        // Make sure phone is part of phone_numbers
        let index = -1;
        for (let i = 0, len = record.phone_numbers.length; i < len; i++) {
          if (record.phone_numbers[i].number === phone) {
            index = i;
          }
        }
        if (index === -1) {
          return reply(Boom.badRequest('Phone does not exist'));
        }
        record.phone_number = record.phone_numbers[index].number;
        record.phone_number_type = record.phone_numbers[index].type;
        record
          .save()
          .then(() => {
            return reply(record);
          })
          .catch(err => {
            that._errorHandler(err, request, reply);
          }
        );
      }
    );
  }

  setPrimaryOrganization (request, reply) {
    const User = this.app.orm.user;
    if (!request.payload) {
      return reply(Boom.badRequest('Missing listUser id'));
    }
    if (!request.payload._id) {
      return reply(Boom.badRequesty('Missing listUser id'));
    }
    const that = this;
    User
      .findOne({_id: request.params.id})
      .then(user => {
        if (!user) {
          return reply(Boom.notFound());
        }
        const checkin = user.organizations.id(request.payload._id);
        if (!checkin) {
          return reply(Boom.badRequest('Organization should be part of user organizations'));
        }
        user.organization = checkin;
        user.save().then(() => {
          return reply(user);
        });
      })
      .catch (err => { that._errorHandler(err, request, reply); });

  }

  showAccount (request, reply) {
    this.log.info('calling /account.json for ' + request.params.currentUser.email, { request: request });
    const user = JSON.parse(JSON.stringify(request.params.currentUser));
    if (request.params.currentClient && (request.params.currentClient.id === 'iasc-prod' || request.params.currentClient.id === 'iasc-dev')) {
      user.sub = user.email;
    }
    if (request.params.currentClient && request.params.currentClient.id === 'dart-prod') {
      delete user._id;
    }
    if (request.params.currentClient && request.params.currentClient.id === 'kaya-prod') {
      user.name = user.name.replace(' ', '');
    }
    if (request.params.currentClient &&
      (request.params.currentClient.id === 'rc-shelter-database' ||
        request.params.currentClient.id === 'rc-shelter-db-2-prod' ||
        request.params.currentClient.id === 'deep-prod')) {
      user.active = !user.deleted;
    }
    reply(user);
  }

  notify (request, reply) {
    const Model = this.app.orm.User;

    this.log.debug('[UserController] Notifying user', { request: request });

    const that = this;
    Model
      .findOne({ _id: request.params.id})
      .then(record => {
        if (!record) {
          return reply(Boom.notFound());
        }

        const notPayload = {
          type: 'contact_needs_update',
          createdBy: request.params.currentUser,
          user: record
        };
        that.app.services.NotificationService.send(notPayload, function (out) {
          return reply(out);
        });
      })
      .catch(err => {
        that._errorHandler(err, request, reply);
      });
  }

  addConnection (request, reply) {
    const User = this.app.orm.User;

    this.log.debug('[UserController] Adding connection', { request: request });

    const that = this;

    User
      .findOne({_id: request.params.id})
      .then(user => {
        if (!user) {
          return reply(Boom.notFound());
        }

        if (!user.connections) {
          user.connections = [];
        }
        if (user.connectionsIndex(request.params.currentUser._id) !== -1) {
          return reply(Boom.badRequest('User is already a connection'));
        }

        user.connections.push({pending: true, user: request.params.currentUser._id});

        user
          .save()
          .then(() => {
            reply(user);

            const notification = {
              type: 'connection_request',
              createdBy: request.params.currentUser,
              user: user
            };
            that.app.services.NotificationService.send(notification, function () {

            });
          }
        );
      })
      .catch(err => {
        that._errorHandler(err, request, reply);
      }
    );
  }

  updateConnection (request, reply) {
    const User = this.app.orm.User;

    this.log.debug('[UserController] Updating connection', { request: request });

    const that = this;

    User
      .findOne({_id: request.params.id})
      .then(user => {
        if (!user) {
          return reply(Boom.notFound());
        }
        const connection = user.connections.id(request.params.cid);
        connection.pending = false;
        return user
          .save()
          .then(() => {
            return {user: user, connection: connection};
          });
      })
      .then(result => {
        User
          .findOne({_id: result.connection.user})
          .then(cuser => {
            // Create connection with current user
            const cindex = cuser.connectionsIndex(result.user._id);
            if (cindex === -1) {
              cuser.connections.push({pending: false, user: result.user._id});
            }
            else {
              cuser.connections[cindex].pending = false;
            }
            cuser
              .save()
              .then(() => {
                reply(result.user);
                // Send notification
                const notification = {
                  type: 'connection_approved',
                  createdBy: result.user,
                  user: cuser
                };
                that.app.services.NotificationService.send(notification, function () {

                });
              }
            );
          }
        );
      })
      .catch(err => {
        that._errorHandler(err, request, reply);
      }
    );
  }

  deleteConnection (request, reply) {
    const User = this.app.orm.User;

    this.log.debug('[UserController] Deleting connection', { request: request });

    const that = this;

    User
      .findOne({_id: request.params.id})
      .then(user => {
        if (!user) {
          return reply(Boom.notFound());
        }
        user.connections.id(request.params.cid).remove();
        user
          .save()
          .then(() => {
            reply(user);
          });
      })
      .catch(err => {
        that._errorHandler(err, request, reply);
      });
  }
};
