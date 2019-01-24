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

  addUserToContactFolders: function (listId, user) {
    return this
      .findByList(listId)
      .then(osyncs => {
        if (osyncs.length) {
          const fn = function (osync) {
            return osync.addUser(user);
          };
          const actions = osyncs.map(fn);
          return Promise.all(actions);
        }
      });
  },

  deleteUserFromContactFolders: function (listId, userId) {
    return this
      .findByList(listId)
      .then(osyncs => {
        if (osyncs.length) {
          const fn = function (osync) {
            return osync.deleteUser(userId);
          };
          const actions = osyncs.map(fn);
          return Promise.all(actions);
        }
      });
  },

  synchronizeUser: function (user) {
    // Get all lists from user
    const listIds = user.getListIds();

    // Find the gsssyncs associated to the lists
    return OutlookSync
      .find({list: {$in: listIds}})
      .then(osyncs => {
        if (osyncs.length) {
          // For each gsssync, call updateUser
          const fn = function (osync) {
            return osync.updateUser(user);
          };
          const actions = osyncs.map(fn);
          return Promise.all(actions);
        }
      })
      .then(values => {
        return user;
      });
  }

};
