/**
 * @module removeFieldFavoriteLists
 * @description Permanently removes the favoriteLists field from all users.
 */
const mongoose = require('mongoose');
const app = require('../');
const config = require('../config/env')[process.env.NODE_ENV];

const { logger } = config;

// Connect to DB
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

// Load User model
const User = require('../api/models/User');

async function run() {
  // Drop the `favoriteLists` field from all users
  await User.collection.updateMany({}, {
    $unset: {
      'favoriteLists': 1,
    },
  }).catch(err => {
    logger.warn(
      `[commands->removeFieldFavoriteLists] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->removeFieldFavoriteLists] Removed favoriteLists field from all users',
    {
      migration: true,
    },
  );

  // We're done.
  process.exit();
}

(async function () {
  await run();
}()).catch(err => {
  logger.error(
    `[commands->removeFieldFavoriteLists] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
