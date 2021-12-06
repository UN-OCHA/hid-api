/**
 * @module migrateCreatedBy
 * @description Removes the createdBy property from all users.
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
  // Drop the `createdBy` field from all users.
  await User.collection.updateMany({}, {
    $unset: {
      createdBy: 1,
    },
  }).catch((err) => {
    logger.warn(
      `[commands->migrateCreatedBy] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->migrateCreatedBy] Removed createdBy field from all users',
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
    `[commands->migrateCreatedBy] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
