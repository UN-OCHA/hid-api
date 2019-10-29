/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module deleteOldNotifications
 * @description Deletes notifications older than 6 months from the database.
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const Notification = require('../api/models/Notification');

async function run() {
  const current = Date.now();
  const sixMonths = new Date(current - 182 * 24 * 3600 * 1000);
  await Notification.deleteMany({ createdAt: { $lt: sixMonths } });
  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
