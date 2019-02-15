'use strict';

const OutlookSync = require('../models/OutlookSync');

/**
 * @module OutlookService
 * @description Outlook Service
 */
module.exports = {

  findByList: function (listId) {
    return OutlookSync
      .find({list: listId});
  },

  addUserToContactFolders: async function (listId, user) {
    const osyncs = await OutlookSync.find({list: listId});
    if (osyncs.length) {
      const fn = function (osync) {
        return osync.addUser(user);
      };
      const actions = osyncs.map(fn);
      return Promise.all(actions);
    }
  },

  deleteUserFromContactFolders: async function (listId, userId) {
    const osyncs = await OutlookSync.find({list: listId});
    if (osyncs.length) {
      const fn = function (osync) {
        return osync.deleteUser(userId);
      };
      const actions = osyncs.map(fn);
      return Promise.all(actions);
    }
  },

  synchronizeUser: async function (user) {
    // Get all lists from user
    const listIds = user.getListIds();

    // Find the gsssyncs associated to the lists
    const osyncs = await OutlookSync.find({list: {$in: listIds}});
    if (osyncs.length) {
      // For each gsssync, call updateUser
      const fn = function (osync) {
        return osync.updateUser(user);
      };
      const actions = osyncs.map(fn);
      return Promise.all(actions);
    }
  }

};
