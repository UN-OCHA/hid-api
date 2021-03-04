/**
 * @module removeFieldLists
 * @description Permanently removes the fields related to lists from all users:
 * - lists
 * - operations
 * - bundles
 * - disasters
 * - organizations
 * - offices
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
  // Drop all list-related fields from all users.
  await User.collection.updateMany({}, {
    $unset: {
      'organization': 1,
      'organizations': 1,
      'lists': 1,
      'operations': 1,
      'bundles': 1,
      'disasters': 1,
      'offices': 1,
    },
  }).catch(err => {
    logger.warn(
      `[commands->removeFieldLists] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->removeFieldLists] Removed list-related fields from all user objects',
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
    `[commands->removeFieldLists] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
