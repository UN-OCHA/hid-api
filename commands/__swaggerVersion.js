/**
 * This file is NOT a jenkins command, but a script we need to run at buildtime
 * in order to keep our API docs on the current version.
 */
const fs = require('fs');
const path = require('path');
const packageJson = require('./..package.json');
const app = require('..');

const { logger } = app.config.env;

async function run() {
  // Our official version number
  const { version } = packageJson;

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
