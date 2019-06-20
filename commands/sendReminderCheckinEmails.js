/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module sendReminderCheckinEmails
 * @description Sends a notification to users who checked into a list more than 48 hours ago and
 * didn't update their contact details.
 */

const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const User = require('../api/models/User');
const NotificationService = require('../api/services/NotificationService');

async function run() {
  const cursor = User
    .find({ 'operations.remindedCheckin': false })
    .populate('operations.list')
    .cursor({ noCursorTimeout: true });

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    for (const lu of user.operations) {
      const d = new Date();
      const offset = d.valueOf() - lu.valueOf();

      if (!lu.remindedCheckin && offset > 48 * 3600 * 1000
        && offset < 72 * 3600 * 1000
        && !lu.deleted) {
        const hasLocalPhoneNumber = user.hasLocalPhoneNumber(lu.list.metadata.country.pcode);
        const inCountry = await user.isInCountry(lu.list.metadata.country.pcode);
        const notification = {
          type: 'reminder_checkin',
          user,
          params: {
            listUser: lu, list: lu.list, hasLocalPhoneNumber, inCountry,
          },
        };
        await NotificationService.send(notification);
        lu.remindedCheckin = true;
        await user.save();
      }
    }
  }
  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
