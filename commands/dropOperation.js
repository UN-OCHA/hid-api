/**
 * @module dropOperation
 * @description Drops the Operation collection permanently.
 *
 * docker-compose exec dev node ./commands/dropOperation.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const Operation = require('../api/models/Operation');

async function run() {
  // Drop the Operation collection
  await Operation.collection.drop().then(data => {
    logger.info(
      '[commands->dropOperation] dropped Operation collection',
      {
        migration: true,
      },
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropOperation] failed to drop Operation collection',
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
    `[commands->dropOperation] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
