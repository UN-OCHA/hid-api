/**
 * @module deleteExpiredTokens
 * @description Deletes the expired OAuth tokens from the database.
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env.database.store;
mongoose.connect(store.uri, store.options);

const OauthToken = require('../api/models/OauthToken');

async function run() {
  const now = new Date();
  await OauthToken.deleteMany({ expires: { $lt: now } });
  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
