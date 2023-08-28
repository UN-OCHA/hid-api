/**
 * @module swaggerVersion
 * @description Text replacement on API docs to ensure they always display the
 * same version number as our package.json. This file is NOT a Jenkins command,
 * but a script we need to run at build-time in order to keep our API docs on
 * the current version. Run before generating docs.
 *
 * docker-compose exec api node ./commands/__swaggerVersion.js
 * docker-compose exec api npm run docs
 */
const fs = require('fs');
const path = require('path');
const { pkg } = require('../app');
const { logger } = require('../config/env');

async function run() {
  // Our official version number from package.json
  const { version } = pkg;

  // The file we want to edit.
  const swaggerFile = path.join(__dirname, '/..', '/docs/swaggerBase.yaml');
  const swaggerBase = fs.readFileSync(swaggerFile, 'utf8');
  const swaggerBaseModified = swaggerBase.replace('<<<VERSION>>>', version);

  // Write to disk.
  fs.writeFileSync(swaggerFile, swaggerBaseModified);

  // Done!
  process.exit();
}

(async function iife() {
  await run();
}()).catch((err) => {
  logger.error(
    `[commands->swaggerVersion] ${err.message}`,
    {
      migration: true,
      fail: true,
      stack_trace: err.stack,
    },
  );
  process.exit(1);
});
