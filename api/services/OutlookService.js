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

};
