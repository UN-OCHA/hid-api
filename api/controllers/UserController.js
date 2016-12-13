'use strict';

const Controller = require('trails-controller');
const Boom = require('boom');
const Bcrypt = require('bcryptjs');
const fs = require('fs');
const childAttributes = ['lists', 'organization', 'organizations', 'operations', 'bundles', 'disasters'];
const userPopulate = 'favoriteLists operations.list disasters.list bundles.list organization.list organizations.list authorizedClients';

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
    this.log.error(err);
    if (err.isBoom) {
      return reply(err);
    }
    else {
      return reply(Boom.badImplementation(err.toString()));
    }
  }

  create (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const Model = this.app.orm.user;

    this.log.debug('[UserController] (create) payload =', request.payload, 'options =', options);

    if (request.payload.password && request.payload.confirm_password) {
      request.payload.password = Model.hashPassword(request.payload.password);
    }
    else {
      // Set a random password
      // TODO: check that the password is random and long enough
      request.payload.password = Model.hashPassword(Math.random().toString(36).slice(2));
    }

    if (!request.payload.app_verify_url) {
      return reply(Boom.badRequest('Missing app_verify_url'));
    }
    var app_verify_url = request.payload.app_verify_url;
    delete request.payload.app_verify_url;

    var registration_type = '';
    if (request.payload.registration_type) {
      registration_type = request.payload.registration_type;
      delete request.payload.registration_type;
    }

    this._removeForbiddenAttributes(request);

    // Makes sure only admins or anonymous users can create users
    if (request.params.currentUser && !request.params.currentUser.is_admin) return reply(Boom.forbidden('You need to be an administrator'))

    if (request.params.currentUser) request.payload.createdBy = request.params.currentUser._id
    // If an orphan is being created, do not expire
    if (request.params.currentUser && registration_type == '') request.payload.expires = new Date(0, 0, 1, 0, 0, 0)

    if (request.payload.email) {
      request.payload.emails = new Array()
      request.payload.emails.push({type: 'Work', email: request.payload.email, validated: false})
    }

    var that = this
    Model.create(request.payload, function (err, user) {
      if (!user) return reply(Boom.badRequest(err.message))
      if (user.email) {
        if (!request.params.currentUser) {
          that.app.services.EmailService.sendRegister(user, app_verify_url, function (merr, info) {
            return reply(user);
          });
        }
        else {
          // An admin is creating an orphan user or Kiosk registration
          if (registration_type == 'kiosk') {
            that.app.services.EmailService.sendRegisterKiosk(user, app_verify_url, function (merr, info) {
              return reply(user)
            });
          }
          else {
            that.app.services.EmailService.sendRegisterOrphan(user, request.params.currentUser, app_verify_url, function (merr, info) {
              return reply(user);
            });
          }
        }
      }
      else {
        return reply(user);
      }
    });
  }

  find (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    let response, count;

    if (!options.populate) {
      options.populate = userPopulate;
    }

    if (criteria['organizations.list']) {
      criteria.$or = [{'organizations.list': criteria['organizations.list']}, {'organization.list': criteria['organizations.list']}];
      delete criteria['organizations.list'];
    }

    // Hide unconfirmed users
    if (request.params.currentUser && !request.params.currentUser.is_admin) criteria['email_verified'] = true

    if (criteria['roles.id']) {
      criteria['roles.id'] = parseInt(criteria['roles.id']);
    }

    if (criteria.name) {
      criteria.name = new RegExp(criteria.name, 'i');
    }

    if (criteria.country) {
      criteria['location.country.id'] = criteria.country;
      delete criteria.country;
    }

    this.log.debug('[UserController] (find) criteria =', request.query, request.params.id,
      'options =', options);

    if (request.params.id) {
      response = FootprintService.find('user', request.params.id, options);
    }
    else {
      response = FootprintService.find('user', criteria, options);
    }
    count = FootprintService.count('user', criteria);

    count.then(number => {
      reply(
        response
          .then(result => {
            if (!result) {
              return Boom.notFound();
            }

            if (request.params.id) {
              result.sanitize();
            }
            else {
              if (result.length) {
                for (var i = 0, len = result.length; i < len; i++) {
                  result[i].sanitize();
                }
              }
            }
            return result;
          })
          .catch(function (err) { that.log.debug(err); })
        )
        .header('X-Total-Count', number);
    });
  }

  _updateQuery (request, options) {
    const Model = this.app.orm.user;
    return Model
      .update({ _id: request.params.id }, request.payload, {runValidators: true})
      .exec()
      .then(() => {
        Model
          .findOne({ _id: request.params.id })
          .populate(options.populate)
          .then((user) => { return user; })
          .catch(err => { return Boom.badRequest(err.message); });
      })
      .catch(err => { return Boom.badRequest(err.message); });
  }

  update (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);
    const Model = this.app.orm.user;

    if (!options.populate) {
      options.populate = userPopulate;
    }

    this.log.debug('[UserController] (update) model = user, criteria =', request.query, request.params.id,
      ', values = ', request.payload);

    this._removeForbiddenAttributes(request);
    if (request.payload.password) {
      delete request.payload.password;
    }

    var that = this;
    if (request.params.id) {
      if ((request.payload.old_password && request.payload.new_password) || request.payload.verified) {
        // Check old password
        Model
          .findOne({_id: request.params.id})
          .then((user) => {
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
          .catch(err => { return Boom.badRequest(err.message); });
      }
      else {
        reply(this._updateQuery(request, options));
      }
    }
    else {
      reply(Boom.badRequest());
    }
  }

  destroy (request, reply) {
    const FootprintService = this.app.services.FootprintService;
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query);

    this.log.debug('[UserController] (destroy) model = user, query =', request.query);

    var that = this;
    var query = FootprintService.destroy('user', request.params.id, options);
    reply(query);
    query
      .then((doc) => {
        // Send notification if user is being deleted by an admin
        if (request.params.currentUser.id !== doc.id) {
          that.app.services.NotificationService.send({type: 'admin_delete', createdBy: request.params.currentUser, user: doc}, () => { });
        }
      });
  }

  checkin (request, reply) {
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const userId = request.params.id;
    const childAttribute = request.params.childAttribute;
    const payload = request.payload;
    const Model = this.app.orm.user;
    const List = this.app.orm.list;

    this.log.debug('[UserController] (checkin) user ->', childAttribute, ', payload =', payload,
      'options =', options);

    if (childAttributes.indexOf(childAttribute) === -1) {
      return reply(Boom.notFound());
    }

    // Make sure there is a list in the payload
    if (!payload.list) {
      return reply(Boom.badRequest('Missing list attribute'));
    }

    const that = this;

    List
      .findOne({ '_id': payload.list })
      .catch(err => { that._errorHandler(err, reply); })
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
          .findOne({ _id: userId })
          .then((record) => {
            if (!record) {
              throw new Boom.badRequest('User not found');
            }
            return {list: list, user: record};
          });
      })
      .then((result) => {
        var record = result.user;
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

          // TODO: make sure user is allowed to join this list

          record[childAttribute].push(payload);
        }
        else {
          record.organization = payload;
        }
        that.log.debug('Saving new checkin');
        return record
          .save()
          .then((record2) => {
            return {list: result.list, user: record2};
        });
      })
      .then((result) => {
        that.log.debug('Populating user');
        var list = result.list, user = result.user;
        // Populate user and notify checked in user if needed
        user.populate(userPopulate, (err, user) => {
          if(!err) {
            reply(user);
          }
        });
        // Notify user if needed
        if (request.params.currentUser.id !== userId) {
          that.log.debug('Checked in by a different user');
          that.app.services.NotificationService.send({
            type: 'admin_checkin',
            createdBy: request.params.currentUser,
            user: user,
            params: { list: list }
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
      });
  }

  checkout (request, reply) {
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const userId = request.params.id;
    const childAttribute = request.params.childAttribute;
    const checkInId = request.params.checkInId;
    const payload = request.payload;
    const Model = this.app.orm.user;

    this.log.debug('[UserController] (checkout) user ->', childAttribute, ', payload =', payload,
      'options =', options);

    if (childAttributes.indexOf(childAttribute) === -1) {
      return this._errorHandler(Boom.notFound(), reply);
    }

    var that = this;
    Model
      .findOne({ _id: userId })
      .populate(userPopulate)
      .catch(err => that._errorHandler(err, reply))
      .then(record => {
        var list = {};
        if (childAttribute !== 'organization') {
          record[childAttribute] = record[childAttribute].filter(function (elt, index) {
            if (elt._id.equals(checkInId)) {
              list = elt.list;
            }
            return !elt._id.equals(checkInId);
          });
        }
        else {
          list = record.organization.list;
          record.organization = {};
        }

        return record
          .save()
          .then(() => {
            return {list: list, user: record};
          });
      })
      .then(result => {
        var user = result.user,
          list = result.list;
        reply(user);
        // Send notification if needed
        if (request.params.currentUser.id !== userId) {
          that.app.services.NotificationService.send({
            type: 'admin_checkout',
            createdBy: request.params.currentUser,
            user: user,
            params: { list: list }
          }, () => { });
        }
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
    var parts = {}, email = ''

    this.log.debug('[UserController] Verifying email ')

    if (!request.payload.hash && !request.params.email) return reply(Boom.badRequest())
    // TODO: make sure current user can do this

    if (request.payload.hash) {
      parts = Model.explodeHash(request.payload.hash)
      email = parts.email
    }
    else {
      email = request.params.email
    }

    var that = this;
    Model
      .findOne({ 'emails.email': email })
      .then(record => {
        if (!record) return reply(Boom.notFound())
        if (request.payload.hash) {
          // Verify hash
          var valid = record.validHash(request.payload.hash)
          if (valid === true) {
            // Verify user email
            if (record.email == parts.email) {
              record.email_verified = true
              record.expires = new Date(0, 0, 1, 0, 0, 0)
              record.emails[0].validated = true
              record.emails.set(0, record.emails[0])
              record.save().then(() => {
                that.app.services.EmailService.sendPostRegister(record, function (merr, info) {
                  return reply(record);
                });
              })
              .catch(err => { return reply(Boom.badImplementation(err.toString())) })
            }
            else {
              for (var i = 0, len = record.emails.length; i < len; i++) {
                if (record.emails[i].email == parts.email) {
                  record.emails[i].validated = true
                  record.emails.set(i, record.emails[i])
                }
              }
              record.save().then((r) => {
                return reply(r)
              })
              .catch(err => { return reply(Boom.badImplementation(err.toString())) })
            }
          }
          else {
            return reply(Boom.badRequest(valid))
          }
        }
        else {
          // Send validation email again
          const app_validation_url = request.payload.app_validation_url
          that.app.services.EmailService.sendValidationEmail(record, email, app_validation_url, function (err, info) {
            return reply('Validation email sent successfully').code(202)
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
          var path = __dirname + "/../../pictures/" + userId + '.' + ext;
          var file = fs.createWriteStream(path);

          file.on('error', function (err) {
            reply(Boom.badImplementation(err))
          });

          data.file.pipe(file);

          data.file.on('end', function (err) {
            record.picture = process.env.ROOT_URL + "/pictures/" + userId + "." + ext;
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
    const Model = this.app.orm['user']
    const phone = request.payload.phone

    this.log.debug('[UserController] Setting primary phone number')

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
        .catch(err => { return reply(Boom.badImplementation(err.message)) })
      })
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
