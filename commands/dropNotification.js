/**
 * @module dropNotification
 * @description Drops the Notification collection permanently.
 *
 * docker-compose exec dev node ./commands/dropNotification.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const Notification = require('../api/models/Notification');

async function run() {
  // Drop the Notifications collection
  await Notification.collection.drop().then(data => {
    logger.info(
      '[commands->dropNotification] dropped Notification collection',
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropNotification] failed to drop Notification collection',
      {
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  process.exit();
}

(async function () {
  await run();
}()).catch(err => {
  logger.error(
    `[commands->dropNotification] ${err.message}`,
    {
      fail: true,
    },
  );
  process.exit(1);
});
