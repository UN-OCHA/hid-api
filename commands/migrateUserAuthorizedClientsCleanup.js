/**
 * @module migrateUserAuthorizedClientsCleanup
 * @description Removes the high-water mark and legacy data from all users.
 */
const mongoose = require('mongoose');
const config = require('../config/env');

const { logger } = config;
const { store } = config.database;

// Connect to DB
mongoose.connect(store.uri, store.options);

// Load User model
const User = require('../api/models/User');

async function run() {
  // Drop fields related to password expiry notifications from all users.
  await User.collection.updateMany({}, {
    $unset: {
      authorizedClients: 1,
      oauthClientsMigrated: 1,
    },
  }).catch((err) => {
    logger.warn(
      `[commands->migrateUserAuthorizedClientsCleanup] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->migrateUserAuthorizedClientsCleanup] Removed authorizedClients, oauthClientsMigrated field from all users',
    {
      migration: true,
    },
  );

  // We're done.
  process.exit();
}

(async function iife() {
  await run();
}()).catch((err) => {
  logger.error(
    `[commands->migrateUserAuthorizedClientsCleanup] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
