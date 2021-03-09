/**
 * @module dropDuplicate
 * @description Drops the Duplicate collection permanently.
 *
 * docker-compose exec dev node ./commands/dropDuplicate.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const Duplicate = require('../api/models/Duplicate');

async function run() {
  // Drop the Duplicate collection
  await Duplicate.collection.drop().then(data => {
    logger.info(
      '[commands->dropDuplicate] dropped Duplicate collection',
      {
        migration: true,
      },
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropDuplicate] failed to drop Duplicate collection',
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
    `[commands->dropDuplicate] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
