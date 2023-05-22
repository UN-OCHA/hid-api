/**
 * @module deleteExpiredTokens
 * @description Deletes the expired OAuth tokens from the database.
 */
const mongoose = require('mongoose');
const OauthToken = require('../api/models/OauthToken');
const env = require('../config/env');

const { logger } = env;

// Connect to DB.
const store = env.database.store;
mongoose.connect(store.uri, store.options);

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
