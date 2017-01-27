'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const _ = require('lodash');
const childAttributes = ['lists', 'organization', 'organizations', 'operations', 'bundles', 'disasters', 'functional_roles'];

/**
 * @module ListUserController
 * @description Generated Trails.js Controller.
 */
module.exports = class ListUserController extends Controller{

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
          throw Boom.badRequest('Wrong list type');
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
              throw Boom.badRequest('User not found');
            }
            return {list: list, user: record};
          });
      })
      .then((result) => {
        let record = result.user,
          list = result.list;
        if (childAttribute !== 'organization') {
          if (!record[childAttribute]) {
            record[childAttribute] = [];
          }

          // Make sure user is not already checked in this list
          for (var i = 0, len = record[childAttribute].length; i < len; i++) {
            if (record[childAttribute][i].list.equals(list._id)) {
              throw Boom.badRequest('User is already checked in');
            }
          }
        }
        return result;
      })
      .then((result) => {
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
            user: result.user,
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
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  update (request, reply) {
    const ListUser = this.app.orm.ListUser;
    const NotificationService = this.app.services.NotificationService;

    this.log.debug('[ListUserController] (update) model = list, criteria =', request.query, request.params.checkInId, ', values = ', request.payload);

    var that = this;
    ListUser
      .findOne({_id: request.params.checkInId})
      .populate('list user')
      .then((lu) => {
        console.log(lu);
        if (!lu) {
          return reply(Boom.notFound());
        }
        return ListUser
          .update({_id: request.params.checkInId}, request.payload)
          .exec()
          .then(() => {
            let out = _.cloneDeep(lu);
            _.assign(out, request.payload);
            reply(out);
            if (lu.pending === true && request.payload.pending === false) {
              // Send a notification to inform user that his checkin is not pending anymore
              var notification = {type: 'approved_checkin', user: lu.user, createdBy: request.params.currentUser, params: { list: lu.list}};
              NotificationService.send(notification, () => {});
            }
          });
      });
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
      return reply(Boom.notFound());
    }

    var that = this;
    var query = ListUser
      .findOne({ _id: checkInId })
      .populate('list user')
      .then(record => {
        if (!record) {
          throw Boom.notFound();
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
          if (user[listType + 's'][i] === checkInId) {
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
      .catch(err => { that.app.services.ErrorService.handle(err, reply); });
  }

};
