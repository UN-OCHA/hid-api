/**
 * @module removeFieldAppMetadata
 * @description Permanently removes the appMetadata field from all users.
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
  // Drop `appMetadata` from all users.
  await User.collection.updateMany({}, {
    $unset: {
      'appMetadata': 1,
    },
  }).catch(err => {
    logger.warn(
      `[commands->removeFieldAppMetadata] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->removeFieldAppMetadata] Removed appMetadata field from all users',
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
    `[commands->removeFieldAppMetadata] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
