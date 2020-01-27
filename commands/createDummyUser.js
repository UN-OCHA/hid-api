/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module createDummyUser
 * @description Create a test user.
 *
 * docker-compose exec dev node ./commands/createDummyUser.js
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const User = require('../api/models/User');

async function run() {
  let reginfo = {
    email: 'test@example.com',
    password: 'testing',
    family_name: 'test',
    given_name: 'test'
  };

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
