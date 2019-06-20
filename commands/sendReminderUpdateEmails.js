/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module sendReminderUpdateEmails
 * @description Sends a reminder to users who didn't update their profile
 * in the last 6 months to update it.
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const User = require('../api/models/User');
const EmailService = require('../api/services/EmailService');

async function run() {
  const d = new Date();
  const sixMonthsAgo = d.valueOf() - 183 * 24 * 3600 * 1000;

  const cursor = User.find({
    lastModified: { $lt: sixMonthsAgo },
    authOnly: false,
  }).cursor();

  const promises = [];
  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    if (user.shouldSendReminderUpdate()) {
      promises.push(EmailService.sendReminderUpdate(user));
      promises.push(User.collection.updateOne(
        { _id: user._id },
        {
          $set: {
            remindedUpdate: new Date(),
          },
        },
      ));
    }
  }
  await Promise.all(promises);
  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
