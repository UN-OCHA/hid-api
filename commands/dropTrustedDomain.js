/**
 * @module dropTrustedDomain
 * @description Drops the TrustedDomain collection permanently.
 *
 * docker-compose exec dev node ./commands/dropTrustedDomain.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const TrustedDomain = require('../api/models/TrustedDomain');

async function run() {
  // Drop the TrustedDomain collection
  await TrustedDomain.collection.drop().then(data => {
    logger.info(
      '[commands->dropTrustedDomain] dropped TrustedDomain collection',
      {
        migration: true,
      },
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropTrustedDomain] failed to drop TrustedDomain collection',
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
    `[commands->dropTrustedDomain] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
