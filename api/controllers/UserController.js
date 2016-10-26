'use strict'

const Controller = require('trails-controller')
const Boom = require('boom')
const Bcrypt = require('bcryptjs')
const childAttributes = ['lists', 'organizations', 'operations', 'bundles', 'disasters']
const forbiddenAttributes = ['is_orphan', 'is_ghost', 'createdBy', 'expires']

/**
 * @module UserController
 * @description Generated Trails.js Controller.
 */
module.exports = class UserController extends Controller{

  create (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const Model = this.app.orm['user']

    this.log.debug('[UserController] (create) payload =', request.payload, 'options =', options)

    if (request.payload.password && request.payload.confirm_password) {
      request.payload.password = Model.hashPassword(request.payload.password)
    }
    else {
      // Set a random password
      // TODO: check that the password is random and long enough
      request.payload.password = Model.hashPassword(Math.random().toString(36).slice(2))
    }

    if (!request.payload.app_verify_url) return reply(Boom.badRequest('Missing app_verify_url'))
    var app_verify_url = request.payload.app_verify_url
    delete request.payload.app_verify_url

    var registration_type = ''
    if (request.payload.registration_type) {
      registration_type = request.payload.registration_type
      delete request.payload.registration_type
    }

    // Do not allow childAttributes to be updated through the update method
    for (var i = 0, len = childAttributes.length; i < len; i++) {
      if (request.payload[childAttributes[i]]) {
        delete request.payload[childAttributes[i]]
      }
    }

    // Do not allow forbiddenAttributes to be created through the create method
    for (var i = 0, len = forbiddenAttributes.length; i < len; i++) {
      if (request.payload[forbiddenAttributes[i]]) {
        delete request.payload[forbiddenAttributes[i]]
      }
    }

    // TODO: make sure only admins or anonymous users can create users

    if (request.params.currentUser) request.payload.createdBy = request.params.currentUser._id
    // If an orphan is being created, do not expire
    if (request.params.currentUser && registration_type == '') request.payload.expires = new Date(0, 0, 1, 0, 0, 0)

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
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)
    let response, count

    if (!options.populate) {
      options.populate = "favoriteLists";
      if (request.params.id) options.populate = "favoriteLists operations.list disasters.list bundles.list organizations.list"
    }

    // Hide unconfirmed users
    if (request.params.currentUser && !request.params.currentUser.is_admin) criteria['email_verified'] = true

    if (criteria['roles.id']) {
      criteria['roles.id'] = parseInt(criteria['roles.id']);
    }

    if (criteria['name']) {
      criteria['name'] = new RegExp(criteria['name'], "i")
    }

    if (criteria['country']) {
      criteria['location.country.id'] = criteria['country'];
      delete criteria['country'];
    }

    this.log.debug('[FootprintController] (find) model = user, criteria =', request.query, request.params.id,
      'options =', options)

    if (request.params.id) {
      response = FootprintService.find('user', request.params.id, options)
    }
    else {
      response = FootprintService.find('user', criteria, options)
    }
    count = FootprintService.count('user', criteria)

    count.then(number => {
      reply(
        response
          .then(result => {
            if (!result) return Boom.notFound()

            return result
          })
          .catch(function (err) { that.log.debug(err); })
        )
        .header('X-Total-Count', number)
    })
  }

  _updateQuery (request, options) {
    const Model = this.app.orm['user']
    return Model
      .update({ _id: request.params.id }, request.payload, {runValidators: true})
      .exec()
      .then(() => Model.findOne({ _id: request.params.id }).populate(options.populate).exec())
      .catch(err => { return Boom.badRequest(err.message) })
  }

  update (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)
    const Model = this.app.orm['user']

    if (!options.populate) options.populate = "favoriteLists operations.list disasters.list bundles.list organizations.list"

    this.log.debug('[UserController] (update) model = user, criteria =', request.query, request.params.id,
      ', values = ', request.payload)

    // Do not allow childAttributes to be updated through the update method
    for (var i = 0, len = childAttributes.length; i < len; i++) {
      if (request.payload[childAttributes[i]]) {
        delete request.payload[childAttributes[i]]
      }
    }

    // Do not allow forbiddenAttributes to be updated through the update method
    for (var i = 0, len = forbiddenAttributes.length; i < len; i++) {
      if (request.payload[forbiddenAttributes[i]]) {
        delete request.payload[forbiddenAttributes[i]]
      }
    }

    var that = this
    if (request.params.id) {
      if (request.payload.old_password && request.payload.new_password) {
        // Check old password
        Model
          .findOne({_id: request.params.id})
          .then((user) => {
            if (user.validPassword(request.payload.old_password)) {
              request.payload.password = Model.hashPassword(request.payload.new_password)
              return reply(that._updateQuery(request, options))
            }
            else {
              return reply(Boom.badRequest('The old password is wrong'))
            }
          });
      }
      else {
        reply(this._updateQuery(request, options))
      }
    }
    else {
      reply(Boom.badRequest())
    }
  }

  destroy (request, reply) {
    const FootprintService = this.app.services.FootprintService
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const criteria = this.app.packs.hapi.getCriteriaFromQuery(request.query)

    this.log.debug('[UserController] (destroy) model = user, query =', request.query)

    if (request.params.id) {
      FootprintService.destroy('listuser', {user: request.params.id}, options)
      reply(FootprintService.destroy('user', request.params.id, options))
    }
    else {
      reply(FootprintService.destroy('user', criteria, options))
    }
  }

  checkin (request, reply) {
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const userId = request.params.id
    const childAttribute = request.params.childAttribute
    const payload = request.payload
    const Model = this.app.orm['user']
    const List = this.app.orm['list']

    this.log.debug('[UserController] (checkin) user ->', childAttribute, ', payload =', payload,
      'options =', options)

    if (childAttributes.indexOf(childAttribute) === -1)
      return reply(Boom.notFound())

    // Make sure there is a list in the payload
    if (!payload.list)
      return reply(Boom.badRequest('Missing list attribute'))

    var that = this

    List
      .findOne({ _id: payload.list })
      .catch(err => { return reply(Boom.badImplementation(err.toString())) })
      .then((list) => {
        // Check that the list added corresponds to the right attribute
        if (childAttribute != list.type + 's') 
          return reply(Boom.badRequest('Wrong list type'))
        
        //Set the proper pending attribute depending on list type
        if (list.joinability == 'public' || list.joinability == 'private')
          payload.pending = false

        Model
          .findOne({ _id: userId })
          .catch(err => { return reply(Boom.badImplementation(err.toString())) })
          .then((record) => {
            if (!record)
              return reply(Boom.notFound())

            if (!record[childAttribute])
              record[childAttribute] = []

            // Make sure user is not already checked in this list
            for (var i = 0, len = record[childAttribute].length; i < len; i++) {
              if (record[childAttribute][i].list.equals(list._id)) {
                return reply(Boom.badRequest('User is already checked in'));
              }
            }

            // TODO: make sure user is allowed to join this list

            record[childAttribute].push(payload)

            record
              .save()
              .catch(err => { return reply(Boom.badImplementation(err.toString())) })
              .then((record2) => {
              return reply(record2)
            })
        })
      })
  }

  checkout (request, reply) {
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query)
    const userId = request.params.id
    const childAttribute = request.params.childAttribute
    const checkInId = request.params.checkInId
    const payload = request.payload
    const Model = this.app.orm['user']

    this.log.debug('[UserController] (checkout) user ->', childAttribute, ', payload =', payload,
      'options =', options)

    var that = this
    Model
      .findOne({ _id: userId })
      .then(record => {
        record[childAttribute] = record[childAttribute].filter(function (elt, index) {
          return !elt._id.equals(checkInId);
        });

        record.save().then(() => {
          return reply(record)
        })
      })
      .catch(err => { return reply(Boom.badImplementation(err.toString())) })
  }

  verifyEmail (request, reply) {
    const Model = this.app.orm['user']

    if (!request.payload.hash) return reply(Boom.badRequest('Missing hash parameter'))

    const parts = Model.explodeHash(request.payload.hash)

    var that = this;
    Model
      .findOne({ email: parts.email })
      .then(record => {
        // Verify hash
        var valid = record.validHash(request.payload.hash)
        if (valid === true) {
          // Verify user email
          record.email_verified = true
          record.expires = new Date(0, 0, 1, 0, 0, 0)
          record.save().then(() => {
            that.app.services.EmailService.sendPostRegister(record, function (merr, info) {
              return reply(record);
            });
          })
        }
        else {
          return reply(Boom.badRequest(valid))
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
          if (!record) return reply(Boom.badRequest('Email could not be found'))
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
                return reply().code(204)
              })
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

}

