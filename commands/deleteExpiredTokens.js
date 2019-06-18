const mongoose = require('mongoose');
const app = require('../');
const config = require('../config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const OauthToken = require('../api/models/OauthToken');

async function run() {
  const now = new Date();
  await OauthToken.deleteMany({ expires: { $lt: now } });
  process.exit();
}

run();
