/**
 * @module readCookie
 * @description Development tool to read an encrypted cookie.
 *
 * docker-compose exec api node ./commands/readCookie.js
 */
const Iron = require('@hapi/iron');
const args = require('yargs').argv;
const env = require('../config/env');

const { logger } = env;

async function run() {
  // Attempt to create new OAuth client and log the result.
  await Iron.unseal(args.cookie, process.env.COOKIE_PASSWORD, Iron.defaults).then((data) => {
    console.log('🍪', data);
  }).catch((err) => {
    logger.warn(
      `[commands->readCookie] ${err.message}`,
      {
        fail: true,
        stack_trace: err.stack,
      },
    );
  });

  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
