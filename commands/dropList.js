/**
 * @module dropList
 * @description Drops the List collection permanently.
 *
 * docker-compose exec dev node ./commands/dropList.js
 */
const mongoose = require('mongoose');
const app = require('../');

const logger = app.config.env[process.env.NODE_ENV].logger;
const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const List = require('../api/models/List');

async function run() {
  // Drop the List collection
  await List.collection.drop().then(data => {
    logger.info(
      '[commands->dropList] dropped List collection',
      {
        migration: true,
      },
    );
  }).catch(err => {
    logger.warn(
      '[commands->dropList] failed to drop List collection',
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
    `[commands->dropList] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
