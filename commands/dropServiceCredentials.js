/**
 * @module dropServiceCredentials
 * @description Drops the Service collection permanently.
 *
 * docker-compose exec dev node ./commands/dropServiceCredentials.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const ServiceCredentials = require('../api/models/ServiceCredentials');

async function run() {
  // Drop the ServiceCredentials collection
  await ServiceCredentials.collection.drop().then(data => {
    logger.info(
      '[commands->dropServiceCredentials] dropped ServiceCredentials collection',
      {
        migration: true,
      },
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropServiceCredentials] failed to drop ServiceCredentials collection',
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
    `[commands->dropServiceCredentials] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
