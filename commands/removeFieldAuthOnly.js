/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module removeFieldAuthOnly
 * @description Permanently removes the authOnly field from all users.
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
  // Load all users.
  const cursor = User.find({}).cursor({ noCursorTimeout: true });

  // Loop through the query results.
  let user;
  for (user = await cursor.next(); user != null; user = await cursor.next()) {
    // Drop the `authOnly` field from this user.
    await User.collection.updateOne({
      _id: user._id,
    }, {
      $unset: {
        authOnly: 1,
      },
    }).catch((err) => {
      logger.error(
        `[commands->removeFieldAuthOnly] ${err.message}`,
        {
          migration: true,
          fail: true,
          stack_trace: err.stack,
        },
      );
    });

    // Log it
    logger.info(
      '[commands->removeFieldAuthOnly] Removing authOnly field from a user object',
      {
        migration: true,
        user: {
          id: user._id.toString(),
          email: user.email || '',
        },
      },
    );
  }

  // We're done.
  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
