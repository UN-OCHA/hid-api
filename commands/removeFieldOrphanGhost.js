/**
 * @module removeFieldOrphanGhost
 * @description Permanently removes the is_orphan, is_ghost fields from all users.
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
  // Drop is_orphan, is_ghost fields from all users.
  await User.collection.updateMany({}, {
    $unset: {
      'is_orphan': 1,
      'is_ghost': 1,
    },
  }).catch(err => {
    logger.warn(
      `[commands->removeFieldOrphanGhost] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Log it
  logger.info(
    '[commands->removeFieldOrphanGhost] Removed is_orphan and is_ghost field from all user objects',
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
    `[commands->removeFieldOrphanGhost] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
