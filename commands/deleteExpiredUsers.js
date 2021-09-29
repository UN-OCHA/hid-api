/**
 * @module deleteExpiredUsers
 * @description Deletes the expired users from the database.
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env.database.store;
mongoose.connect(store.uri, store.options);

const hidAccount = '5b2128e754a0d6046d6c69f2';
const User = require('../api/models/User');
const EmailService = require('../api/services/EmailService');

async function run() {
  const now = new Date();
  const start = new Date(2016, 0, 1, 0, 0, 0);
  const users = await User.find({ expires: { $gt: start, $lt: now } });
  if (users.length > 0) {
    const hidUser = await User.findOne({ _id: hidAccount });
    const promises = [];
    users.forEach((user) => {
      promises.push(EmailService.sendAdminDelete(user, hidUser));
    });
    await Promise.all(promises);
    await User.deleteMany({ expires: { $gt: start, $lt: now } });
  }
  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
