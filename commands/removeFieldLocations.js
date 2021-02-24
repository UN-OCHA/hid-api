/**
 * @module removeFieldLocations
 * @description Permanently removes the location, locations, locationsVisibility
 * fields from all users.
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
  // Drop location, locations, locationsVisibility fields from all users.
  await User.collection.updateMany({}, {
    $unset: {
      'location': 1,
      'locations': 1,
      'locationsVisibility': 1,
    },
  }).catch(err => {
    logger.warn(
      `[commands->removeFieldLocations] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->removeFieldLocations] Removed location, locations, locationsVisibility fields from all users',
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
    `[commands->removeFieldLocations] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
