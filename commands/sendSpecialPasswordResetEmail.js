/**
 * @module sendSpecialPasswordResetEmail
 * @description Sends a system-initiated password reset email.
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env.database.store;
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

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
