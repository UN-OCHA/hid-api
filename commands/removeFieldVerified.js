/**
 * @module removeFieldVerified
 * @description Permanently removes the following fields from all users:
 * - verified
 * - verified_by
 * - verifiedOn
 * - verificationExpiryEmail
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
  // Drop `verified` from all users.
  await User.collection.updateMany({}, {
    $unset: {
      'verified': 1,
      'verified_by': 1,
      'verifiedOn': 1,
      'verificationExpiryEmail': 1,
    },
  }).catch(err => {
    logger.warn(
      `[commands->removeFieldVerified] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->removeFieldVerified] Removed verified, verified_by, verifiedOn, and verificationExpiryEmail fields from all users',
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
    `[commands->removeFieldVerified] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
