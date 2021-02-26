/**
 * @module dropResult
 * @description Drops the Result collection permanently.
 *
 * docker-compose exec dev node ./commands/dropResult.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const Result = require('../api/models/Result');

async function run() {
  // Drop the Result collection
  await Result.collection.drop().then(data => {
    logger.info(
      '[commands->dropResult] dropped Result collection',
      {
        migration: true,
      },
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropResult] failed to drop Result collection',
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
    `[commands->dropResult] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
