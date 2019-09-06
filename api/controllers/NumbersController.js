

const List = require('../models/List');
const User = require('../models/User');

/**
 * @module NumbersController
 * @description Provide the number of custom contact lists, number of auth users,
 * total number of users, number of orphans, number of ghost users and number
 * of verified users.
 */
module.exports = {

  async numbers() {
    const [numberCcls,
      numberAuth,
      numberUsers,
      numberOrphans,
      numberGhosts,
      numberVerified] = await Promise.all([
      List.countDocuments({ type: 'list' }),
      User.countDocuments({ authOnly: true }),
      User.countDocuments({}),
      User.countDocuments({ is_orphan: true }),
      User.countDocuments({ is_ghost: true }),
      User.countDocuments({ verified: true }),
    ]);
    return {
      numberCcls,
      numberOrphans,
      numberGhosts,
      numberAuth,
      numberUsers,
      numberVerified,
    };
  },

};
