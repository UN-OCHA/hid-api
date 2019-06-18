const mongoose = require('mongoose');
const app = require('../');
const config = require('../config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const User = require('../api/models/User');
const EmailService = require('../api/services/EmailService');

async function run() {
  const cursor = User.find({ deleted: false }).cursor();

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    await EmailService.sendSpecialPasswordReset(user);
  }
  process.exit();
}

(async function () {
  await run();
})().catch(e => {
  console.log(e);
  process.exit(1);
})
