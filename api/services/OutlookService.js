

const OutlookSync = require('../models/OutlookSync');

/**
 * @module OutlookService
 * @description Outlook Service
 */
module.exports = {

  findByList(listId) {
    return OutlookSync
      .find({ list: listId });
  },

  async addUserToContactFolders(listId, user) {
    const osyncs = await OutlookSync.find({ list: listId });
    const actions = osyncs.map(osync => osync.addUser(user));
    return Promise.all(actions);
  },

  async deleteUserFromContactFolders(listId, userId) {
    const osyncs = await OutlookSync.find({ list: listId });
    const actions = osyncs.map(osync => osync.deleteUser(userId));
    return Promise.all(actions);
  },

  async synchronizeUser(user) {
    // Get all lists from user
    const listIds = user.getListIds();

    // Find the gsssyncs associated to the lists
    const osyncs = await OutlookSync.find({ list: { $in: listIds } });
    // For each gsssync, call updateUser
    const actions = osyncs.map(osync => osync.updateUser(user));
    return Promise.all(actions);
  },

};
