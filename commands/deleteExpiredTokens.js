/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */

/**
 * @module deleteExpiredTokens
 * @description Deletes the expired OAuth tokens from the database.
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const OauthToken = require('../api/models/OauthToken');

async function run() {
  const now = new Date();
  await OauthToken.deleteMany({ expires: { $lt: now } });
  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
