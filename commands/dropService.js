/**
 * @module dropService
 * @description Drops the Service collection permanently.
 *
 * docker-compose exec dev node ./commands/dropService.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const Service = require('../api/models/Service');

async function run() {
  // Drop the Service collection
  await Service.collection.drop().then(data => {
    logger.info(
      '[commands->dropService] dropped Service collection',
      {
        migration: true,
      },
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropService] failed to drop Service collection',
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
    `[commands->dropService] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
