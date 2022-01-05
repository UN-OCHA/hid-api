/**
 * @module migrateUserAuthorizedClients
 * @description Transforms the authorizedClients array so it can hold metadata
 * about peoples' use of each website, e.g. last time they logged in.
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
  // An array to hold all of the updated users so they can be written to DB in
  // a non-blocking fashion once all transforms are complete.
  const records = [];

  // Drop fields related to password expiry notifications from all users.
  const users = await User.find(
    // Query: which records will be returned?
    {
      oauthClientsMigrated: { $ne: true },
    },
    // Projection: what will be returned inside each record?
    {},
    // Query: additional options
    { limit: 1 }
  ).catch((err) => {
    logger.warn(
      `[commands->migrateUserAuthorizedClients] ${err.message}`,
      {
        migration: true,
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  // Debug info for ELK.
  logger.info(
    `Total users to migrate this run: ${users.length}`,
    {
      migration: true,
    },
  );

  users.forEach(async (user) => {
    // Store the transformed data here
    const transformedClients = [];

    // If the user has authorized clients, transform them to make room for the
    // new metadata.
    if (user.authorizedClients.length) {
      user.authorizedClients.forEach((clientId) => {
        transformedClients.push({
          _id: new mongoose.Types.ObjectId(),
          client: mongoose.Types.ObjectId(clientId),
          lastLogin: null,
        });
      });
    }

    // Create a new user property with transformed data.
    // eslint-disable-next-line no-param-reassign
    user.oauthClients = transformedClients;
    // eslint-disable-next-line no-param-reassign
    user.oauthClientsMigrated = true;

    // Queue this user to be saved.
    records.push(user.save().then(() => {
      logger.info(
        '[commands->migrateUserAuthorizedClients] user migration succeeded',
        {
          migration: true,
          user: {
            id: user.id,
            email: user.email,
          },
        },
      );
    }).catch((err) => {
      logger.error(
        '[commands->migrateUserAuthorizedClients] user migration failed',
        {
          fail: true,
          migration: true,
          stack_trace: err.stack,
          user: {
            id: user.id,
            email: user.email,
          },
        },
      );
    }));
  });

  // Now save them all at the same time.
  await Promise.all(records);

  // We're done.
  process.exit();
}

(async function iife() {
  await run();
}()).catch((err) => {
  logger.error(
    `[commands->migrateUserAuthorizedClients] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
