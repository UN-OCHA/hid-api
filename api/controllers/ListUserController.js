

const Boom = require('boom');
const _ = require('lodash');
const List = require('../models/List');
const User = require('../models/User');
const OutlookService = require('../services/OutlookService');
const NotificationService = require('../services/NotificationService');
const GSSSyncService = require('../services/GSSSyncService');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module ListUserController
 * @description Generated Trails.js Controller.
 */
function checkinHelper(alist, auser, notify, childAttribute, currentUser) {
  const user = auser;
  const list = alist;
  const payload = {
    list: list._id.toString(),
  };

  // Check that the list added corresponds to the right attribute
  if (childAttribute !== `${list.type}s` && childAttribute !== list.type) {
    throw Boom.badRequest('Wrong list type');
  }

  // Set the proper pending attribute depending on list type
  if (list.joinability === 'public'
    || list.joinability === 'private'
    || list.isOwner(currentUser)) {
    payload.pending = false;
  } else {
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
    for (let i = 0, len = user[childAttribute].length; i < len; i += 1) {
      if (user[childAttribute][i].list.equals(list._id)
        && user[childAttribute][i].deleted === false) {
        throw Boom.badRequest('User is already checked in');
      }
    }
  }

  if (childAttribute !== 'organization') {
    user[childAttribute].push(payload);
  } else {
    user.organization = payload;
  }
  user.lastModified = new Date();
  const managers = [];
  list.managers.forEach((manager) => {
    if (manager.toString() !== currentUser._id.toString()) {
      managers.push(manager);
    }
  });
  const promises = [];
  promises.push(user.save());
  if (!user.authOnly) {
    list.count += 1;
    promises.push(list.save());
  }
  // Notify list managers of the checkin
  promises.push(NotificationService.notifyMultiple(managers, {
    type: 'checkin',
    createdBy: user,
    params: { list },
  }));
  // Notify user if needed
  if (currentUser._id.toString() !== user._id.toString() && list.type !== 'list' && notify === true && !user.hidden) {
    logger.debug('Checked in by a different user');
    promises.push(NotificationService.send({
      type: 'admin_checkin',
      createdBy: currentUser,
      user,
      params: { list },
    }));
  }
  // Notify list owner and managers of the new checkin if needed
  if (payload.pending) {
    logger.debug('Notifying list owners and manager of the new checkin');
    promises.push(NotificationService.sendMultiple(list.managers, {
      type: 'pending_checkin',
      params: { list, user },
    }));
  }
  // Synchronize google spreadsheets
  promises.push(GSSSyncService.addUserToSpreadsheets(list._id, user));
  promises.push(OutlookService.addUserToContactFolders(list._id, user));
  return Promise.all(promises);
}

module.exports = {

  checkinHelper,

  async checkin(request) {
    const userId = request.params.id;
    const { childAttribute } = request.params;
    const { payload } = request;
    const childAttributes = User.listAttributes();

    logger.debug('[UserController] (checkin) user ->', childAttribute, ', payload =', payload, { request });

    if (childAttributes.indexOf(childAttribute) === -1 || childAttribute === 'organization') {
      throw Boom.notFound();
    }

    // Make sure there is a list in the payload
    if (!payload.list) {
      throw Boom.badRequest('Missing list attribute');
    }

    let notify = true;
    if (typeof request.payload.notify !== 'undefined') {
      const { notify: notif } = request.payload;
      notify = notif;
    }
    delete request.payload.notify;

    const [list, user] = await Promise.all([List.findOne({ _id: payload.list }).populate('managers'), User.findOne({ _id: userId })]);
    if (!list || !user) {
      throw Boom.notFound();
    }
    await checkinHelper(list, user, notify, childAttribute, request.auth.credentials);
    return user;
  },

  async update(request) {
    const { childAttribute } = request.params;
    const { checkInId } = request.params;

    logger.debug(
      '[ListUserController] (update) model = list, criteria =',
      request.query,
      request.params.checkInId,
      ', values = ',
      request.payload,
      { request },
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

    let listuser = {};
    const record = await User.findOne({ _id: request.params.id });
    if (!record) {
      throw Boom.notFound();
    }
    const lu = record[childAttribute].id(checkInId);
    listuser = _.cloneDeep(lu);
    _.assign(lu, request.payload);
    record.lastModified = new Date();
    const promises = [];
    promises.push(record.save());
    promises.push(List.findOne({ _id: lu.list }));
    const [user, list] = await Promise.all(promises);
    if (listuser.pending === true && request.payload.pending === false) {
      // Send a notification to inform user that his checkin is not pending anymore
      const notification = {
        type: 'approved_checkin',
        user,
        createdBy: request.auth.credentials,
        params: { list },
      };
      await NotificationService.send(notification);
    }
    return user;
  },

  async checkout(request) {
    const userId = request.params.id;
    const { childAttribute } = request.params;
    const { checkInId } = request.params;
    const childAttributes = User.listAttributes();

    if (childAttributes.indexOf(childAttribute) === -1) {
      throw Boom.notFound();
    }

    const user = await User.findOne({ _id: request.params.id });
    if (!user) {
      throw Boom.notFound();
    }
    const lu = user[childAttribute].id(checkInId);
    // Set deleted to true
    lu.deleted = true;
    // If user is checking out of his primary organization,
    // remove the listuser from the organization attribute
    if (childAttribute === 'organizations'
      && user.organization
      && lu.list.toString() === user.organization.list.toString()) {
      user.organization.remove();
    }
    user.lastModified = new Date();
    const list = await List.findOne({ _id: lu.list });
    list.count -= 1;
    const promises = [];
    if (!user.authOnly) {
      list.count -= 1;
      promises.push(list.save());
    }
    promises.push(user.save());
    // Send notification if needed
    if (request.auth.credentials.id !== userId && !user.hidden) {
      promises.push(NotificationService.send({
        type: 'admin_checkout',
        createdBy: request.auth.credentials,
        user,
        params: { list },
      }));
    }
    // Notify list managers of the checkin
    promises.push(NotificationService.notifyMultiple(list.managers, {
      type: 'checkout',
      createdBy: user,
      params: { list },
    }));
    // Synchronize google spreadsheets
    promises.push(GSSSyncService.deleteUserFromSpreadsheets(list._id, user.id));
    promises.push(OutlookService.deleteUserFromContactFolders(list._id, user.id));
    await Promise.all(promises);
    return user;
  },

  async updateListUsers(request, reply) {
    const childAttributes = User.listAttributes();
    const cursor = User
      .find({})
      .populate([{ path: 'lists.list' },
        { path: 'operations.list' },
        { path: 'bundles.list' },
        { path: 'disasters.list' },
        { path: 'organization.list' },
        { path: 'organizations.list' },
        { path: 'functional_roles.list' },
        { path: 'offices.list' },
      ])
      .cursor();

    /* eslint no-await-in-loop: "off" */
    for (let user = await cursor.next(); user != null; user = await cursor.next()) {
      for (let i = 0; i < childAttributes.length; i += 1) {
        const childAttribute = childAttributes[i];
        let lu = {};
        if (childAttribute === 'organization') {
          lu = user[childAttribute];
          if (lu && lu.list && lu.list.owner) {
            lu.owner = lu.list.owner;
            lu.managers = lu.list.managers;
            logger.info(`Updated list for ${user._id.toString()}`);
            /* eslint no-await-in-loop: "off" */
            await user.save();
          } else {
            logger.info(`No list for ${user._id.toString()}`);
          }
        } else {
          for (let j = 0; j < user[childAttribute].length; j += 1) {
            if (lu && lu.list && lu.list.owner) {
              lu.owner = lu.list.owner;
              lu.managers = lu.list.managers;
              logger.info(`Updated list for ${user._id.toString()}`);
              /* eslint no-await-in-loop: "off" */
              await user.save();
            } else {
              logger.info(`No list for ${user._id.toString()}`);
            }
          }
        }
      }
    }
    return reply.response().code(204);
  },

};
