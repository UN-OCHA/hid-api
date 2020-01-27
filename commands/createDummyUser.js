/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module deleteExpiredUsers
 * @description Deletes the expired users from the database.
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const hidAccount = '5b2128e754a0d6046d6c69f2';
const User = require('../api/models/User');
const EmailService = require('../api/services/EmailService');

async function run() {
  const now = new Date();
  const start = new Date(2016, 0, 1, 0, 0, 0);

  let reginfo = {};

  reginfo.email = 'test@example.com';
  reginfo.password = 'testing';
  reginfo.family_name = 'test';
  reginfo.given_name = 'test';
  reginfo.confirm_password = reginfo.password;

  reginfo.emails = [];
  reginfo.emails.push({ type: 'Work', email: reginfo.email, validated: false });

  reginfo.password = User.hashPassword(reginfo.password);
  reginfo.email_verified = true;

  const user = await User.create(reginfo);

  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
