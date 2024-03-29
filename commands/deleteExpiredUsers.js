/**
 * @module deleteExpiredUsers
 * @description Deletes the expired users from the database.
 */
const mongoose = require('mongoose');
const User = require('../api/models/User');
const EmailService = require('../api/services/EmailService');
const env = require('../config/env');

const { logger } = env;

// Connect to DB.
const store = env.database.store;
mongoose.connect(store.uri, store.options);

async function run() {
  const now = new Date();
  const start = new Date(2016, 0, 1, 0, 0, 0);
  const users = await User.find({ expires: { $gt: start, $lt: now } });

  if (users.length > 0) {
    const promises = [];
    users.forEach((user) => {
      promises.push(EmailService.sendAutoExpire(user));
    });

    await Promise.all(promises).catch((err) => {
      logger.warn(
        `[commands->deleteExpiredUsers] ${err.message}`,
        {
          fail: true,
          stack_trace: err.stack,
        },
      );
    });

    await User.deleteMany({ expires: { $gt: start, $lt: now } }).then((data) => {
      logger.info(
        '[commands->deleteExpiredUsers] Removed stale user registrations from database.',
        {
          queryResults: data,
        },
      );
    }).catch((err) => {
      logger.warn(
        `[commands->deleteExpiredUsers] ${err.message}`,
        {
          fail: true,
          stack_trace: err.stack,
        },
      );
    });
  }

  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
