'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const _ = require('lodash');
const async = require('async');

/**
 * @module ListUserController
 * @description Generated Trails.js Controller.
 */
module.exports = class ListUserController extends Controller {

  _checkinHelper (list, user, notify, childAttribute, currentUser) {
    const GSSSyncService = this.app.services.GSSSyncService;
    const OutlookService = this.app.services.OutlookService;
    let payload = {
      list: list._id.toString()
    };
    const that = this;
    let gResult = {};

    // Check that the list added corresponds to the right attribute
    if (childAttribute !== list.type + 's' && childAttribute !== list.type) {
      throw Boom.badRequest('Wrong list type');
    }

    //Set the proper pending attribute depending on list type
    if (list.joinability === 'public' ||
      list.joinability === 'private' ||
      list.isOwner(currentUser)) {
      payload.pending = false;
    }
    else {
      payload.pending = true;
    }

    payload.name = list.name;
    payload.acronym = list.acronym;
    payload.owner = list.owner;
    payload.managers = list.managers;
    payload.visibility = list.visibility;

    if (list.type === 'organization') {
      payload.orgTypeId = list.metadata.type.id;
      payload.orgTypeLabel = list.metadata.type.label;
    }

    if (childAttribute !== 'organization') {
      if (!user[childAttribute]) {
        user[childAttribute] = [];
      }

      // Make sure user is not already checked in this list
      for (let i = 0, len = user[childAttribute].length; i < len; i++) {
        if (user[childAttribute][i].list.equals(list._id) &&
          user[childAttribute][i].deleted === false) {
          throw Boom.badRequest('User is already checked in');
        }
      }
    }

    if (childAttribute !== 'organization') {
      user[childAttribute].push(payload);
    }
    else {
      record.organization = payload;
    }
    user.lastModified = new Date();
    return user
      .save()
      .then(() => {
        list.count = list.count + 1;
        return list
          .save();
      })
      .then(() => {
        const managers = [];
        list.managers.forEach(function (manager) {
          if (manager.toString() !== currentUser._id.toString()) {
            managers.push(manager);
          }
        });
        // Notify list managers of the checkin
        that.app.services.NotificationService.notifyMultiple(managers, {
          type: 'checkin',
          createdBy: user,
          params: { list: list }
        });
        // Notify user if needed
        if (currentUser._id.toString() !== user._id.toString() && list.type !== 'list' && notify === true) {
          that.log.debug('Checked in by a different user');
          that.app.services.NotificationService.send({
            type: 'admin_checkin',
            createdBy: currentUser,
            user: user,
            params: { list: list }
          }, () => { });
        }
        // Notify list owner and managers of the new checkin if needed
        if (payload.pending) {
          that.log.debug('Notifying list owners and manager of the new checkin');
          that.app.services.NotificationService.sendMultiple(list.managers, {
            type: 'pending_checkin',
            params: { list: list, user: user }
          }, () => { });
        }
        // Synchronize google spreadsheets
        return GSSSyncService.addUserToSpreadsheets(list._id, user);
      })
      .then(data => {
        return OutlookService.addUserToContactFolders(list._id, user);
      });
  }

  checkin (request, reply) {
    const userId = request.params.id;
    const childAttribute = request.params.childAttribute;
    const payload = request.payload;
    const List = this.app.orm.List;
    const User = this.app.orm.User;
    const childAttributes = User.listAttributes();

    this.log.debug('[UserController] (checkin) user ->', childAttribute, ', payload =', payload, { request: request});

    if (childAttributes.indexOf(childAttribute) === -1 || childAttribute === 'organization') {
      return reply(Boom.notFound());
    }

    // Make sure there is a list in the payload
    if (!payload.list) {
      return reply(Boom.badRequest('Missing list attribute'));
    }

    let notify = true;
    if (typeof request.payload.notify !== 'undefined') {
      notify = request.payload.notify;
    }
    delete request.payload.notify;

    let list = {}, user = {};
    List
      .findOne({_id: payload.list})
      .then((llist) => {
        if (!llist) {
          throw Boom.notFound();
        }
        list = llist;
        return User
          .findOne({_id: userId});
      })
      .then((luser) => {
        if (!luser) {
          throw Boom.notFound();
        }
        user = luser;
        return this._checkinHelper(list, user, notify, childAttribute, request.params.currentUser);
      })
      .then(() => {
        return reply(user);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  update (request, reply) {
    const User = this.app.orm.User;
    const List = this.app.orm.List;
    const NotificationService = this.app.services.NotificationService;
    const childAttribute = request.params.childAttribute;
    const checkInId = request.params.checkInId;

    this.log.debug(
      '[ListUserController] (update) model = list, criteria =',
      request.query,
      request.params.checkInId,
      ', values = ',
      request.payload,
      { request: request }
    );

    // Make sure list specific attributes can not be set through update
    if (request.payload.list) {
      delete request.payload.list;
    }
    if (request.payload.name) {
      delete request.payload.name;
    }
    if (request.payload.acronym) {
      delete request.payload.acronym;
    }
    if (request.payload.visibility) {
      delete request.payload.visibility;
    }

    const that = this;
    let listuser = {};
    User
      .findOne({ _id: request.params.id })
      .then(record => {
        if (!record) {
          throw Boom.notFound();
        }
        const lu = record[childAttribute].id(checkInId);
        listuser = _.cloneDeep(lu);
        _.assign(lu, request.payload);
        record.lastModified = new Date();
        return record
          .save()
          .then((user) => {
            reply(user);
            return {user: user, listuser: lu};
          });
      })
      .then(result => {
        return List
          .findOne({_id: result.listuser.list})
          .then(list => {
            return {user: result.user, listuser: result.listuser, list: list};
          });
      })
      .then(result => {
        if (listuser.pending === true && request.payload.pending === false) {
          // Send a notification to inform user that his checkin is not pending anymore
          const notification = {
            type: 'approved_checkin',
            user: result.user,
            createdBy: request.params.currentUser,
            params: { list: result.list}
          };
          NotificationService.send(notification, () => {});
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  checkout (request, reply) {
    const options = this.app.packs.hapi.getOptionsFromQuery(request.query);
    const userId = request.params.id;
    const childAttribute = request.params.childAttribute;
    const checkInId = request.params.checkInId;
    const payload = request.payload;
    const User = this.app.orm.user;
    const List = this.app.orm.List;
    const GSSSyncService = this.app.services.GSSSyncService;
    const OutlookService = this.app.services.OutlookService;
    const childAttributes = User.listAttributes();

    this.log.debug('[UserController] (checkout) user ->', childAttribute, ', payload =', payload,
      'options =', options, { request: request });

    if (childAttributes.indexOf(childAttribute) === -1) {
      return reply(Boom.notFound());
    }

    const that = this;
    let gResult = {};

    User
      .findOne({ _id: request.params.id })
      .then(record => {
        if (!record) {
          throw Boom.notFound();
        }
        const lu = record[childAttribute].id(checkInId);
        // Set deleted to true
        lu.deleted = true;
        // If user is checking out of his primary organization, remove the listuser from the organization attribute
        if (childAttribute === 'organizations' && record.organization && lu.list.toString() === record.organization.list.toString()) {
          record.organization.remove();
        }
        record.lastModified = new Date();
        return record
          .save()
          .then((user) => {
            return {user: user, listuser: lu};
          });
      })
      .then((result) => {
        reply(result.user);
        return List
          .findOne({ _id: result.listuser.list })
          .then(list => {
            list.count = list.count - 1;
            return list.save();
          })
          .then(list => {
            return {user: result.user, listuser: result.listuser, list: list};
          });
      })
      .then((result) => {
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
      .then((result) => {
        gResult = result;
        // Synchronize google spreadsheets
        return GSSSyncService.deleteUserFromSpreadsheets(result.list._id, result.user.id);
      })
      .then(data => {
        return OutlookService.deleteUserFromContactFolders(gResult.list._id, gResult.user.id);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  updateListUsers(request, reply) {
    reply();
    const app = this;
    const User = this.app.orm.User;
    const childAttributes = User.listAttributes();
    const stream = User
      .find({})
      .populate([{path: 'lists.list'},
        {path: 'operations.list'},
        {path: 'bundles.list'},
        {path: 'disasters.list'},
        {path: 'organization.list'},
        {path: 'organizations.list'},
        {path: 'functional_roles.list'},
        {path: 'offices.list'}
      ])
      .stream();

    stream.on('data', function(user) {
      this.pause();
      const that = this;
      async.eachSeries(childAttributes, function (attr, nextAttr) {
        async.eachSeries(user[attr], function (lu, nextLu) {
          if (lu && lu.list && lu.list.owner) {
            lu.owner = lu.list.owner;
            lu.managers = lu.list.managers;
            app.log.info('Updated list for ' + user._id.toString());
            user.save(function (err) {
              nextLu();
            });
          }
          else {
            app.log.info('No list for ' + user._id.toString());
            nextLu();
          }
        }, function (err) {
          nextAttr();
        });
      }, function (err) {
        that.resume();
      });
    });

    stream.on('close', function () {
      app.log.info('Finished updating listusers');
    });
  }

};
