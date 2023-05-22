/**
 * @module createDummyUser
 * @description Create a test user.
 *
 * docker-compose exec dev node ./commands/createDummyUser.js
 */
const mongoose = require('mongoose');
const args = require('yargs').argv;
const User = require('../api/models/User');
const env = require('../config/env');

// Connect to DB.
const { store } = env.database;
mongoose.connect(store.uri, store.options);

async function run() {
  const userInfo = {
    email: 'test@example.com',
    password: 'testing',
    family_name: 'test',
    given_name: 'test',
  };

  if (args.email) {
    userInfo.email = args.email;
  }

  if (args.password) {
    userInfo.password = args.password;
  }

  if (args.family_name) {
    userInfo.family_name = args.family_name;
  }

  if (args.given_name) {
    userInfo.given_name = args.given_name;
  }

  userInfo.confirm_password = userInfo.password;

  userInfo.emails = [];
  userInfo.emails.push({ type: 'Work', email: userInfo.email, validated: false });

  userInfo.password = User.hashPassword(userInfo.password);
  userInfo.email_verified = true;

  await User.create(userInfo);

  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
