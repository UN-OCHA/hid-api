

const List = require('../models/List');
const User = require('../models/User');

/**
 * @module NumbersController
 * @description Generated Trails.js Controller.
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
      User.countDocuments({ verified: true }),
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
