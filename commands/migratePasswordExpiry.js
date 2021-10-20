/**
 * @module migratePasswordExpiry
 * @description Removes all properties related to password expiry.
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
      passwordResetAlert30days: 1,
      passwordResetAlert7days: 1,
      passwordResetAlert: 1,
    },
  }).catch((err) => {
    logger.warn(
      `[commands->migratePasswordExpiry] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->migratePasswordExpiry] Removed passwordResetAlert30days, passwordResetAlert7days, passwordResetAlert fields from all users',
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
    `[commands->migratePasswordExpiry] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
