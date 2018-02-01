'use strict';

const Service = require('trails/service');

/**
 * @module OutlookService
 * @description Outlook Service
 */
module.exports = class OutlookService extends Service {

  findByList(listId) {
    const OutlookSync = this.app.orm.OutlookSync;

    return OutlookSync
      .find({list: listId});
  }

  addUserToContactFolders(listId, user) {
    const that = this;
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
  }

  deleteUserFromContactFolders(listId, userId) {
    const that = this;
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
  }

  synchronizeUser (user) {
    // Get all lists from user
    const listIds = user.getListIds();
    const OutlookSync = this.app.orm.OutlookSync;
    const that = this;

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
