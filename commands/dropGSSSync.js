/**
 * @module dropGSSSync
 * @description Drops the GSSSync collection permanently.
 *
 * docker-compose exec dev node ./commands/dropGSSSync.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const GSSSync = require('../api/models/GSSSync');

async function run() {
  // Drop the GSSSync collection
  await GSSSync.collection.drop().then(data => {
    logger.info(
      '[commands->dropGSSSync] dropped GSSSync collection',
      {
        migration: true,
      },
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropGSSSync] failed to drop GSSSync collection',
      {
        migration: true,
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
    `[commands->dropGSSSync] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
