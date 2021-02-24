const List = require('../models/List');
const User = require('../models/User');

/**
 * @module NumbersController
 * @description Provide the number of custom contact lists, number of auth users,
 * total number of users, and number of verified users.
 */
module.exports = {

  async numbers() {
    const [
      numberCcls,
      numberAuth,
      numberUsers,
      numberVerified,
    ] = await Promise.all([
      List.countDocuments({ type: 'list' }),
      User.countDocuments({ authOnly: true }),
      User.countDocuments({}),
      User.countDocuments({ verified: true }),
    ]);
    return {
      numberCcls,
      numberAuth,
      numberUsers,
      numberVerified,
    };
  },

};
