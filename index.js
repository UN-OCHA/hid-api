/**
 * Server start.
 *
 * We've split the init/start actions because having them separate allows the
 * codebase to be unit tested (the tests need init but not start).
 *
 * However when starting the server we need to run them both. Since they're both
 * async functions, we wrap them in an IIFE to allow "top-level" async/await.
 */
const { setup, init, start } = require('./server');

(async function iife() {
  await setup();
  await init();
  await start();
}());
