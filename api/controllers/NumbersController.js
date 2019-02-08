'use strict';

const List = require('../models/List');
const User = require('../models/User');
const ErrorService = require('../services/ErrorService');

/**
 * @module NumbersController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  numbers: async function (request, reply) {
    try {
      const numberCcls = await List.countDocuments({type: 'list'});
      const numberAuth = await User.countDocuments({authOnly: true});
      const numberUsers = await User.countDocuments({});
      const numberOrphans = await User.countDocuments({'is_orphan': true});
      const numberGhosts = await User.countDocuments({'verified': true});
      const numberVerified = await User.countDocuments({'verified': true});
      return reply({
        'numberCcls': numberCcls,
        'numberOrphans': numberOrphans,
        'numberGhosts': numberGhosts,
        'numberAuth': numberAuth,
        'numberUsers': numberUsers,
        'numberVerified': numberVerified
      });
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  }

};
