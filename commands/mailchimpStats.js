/**
 * @module mailchimpStats
 * @description Internal investigation of RW MailChimp. HID-2408.
 *
 * docker-compose exec api node ./commands/mailchimpStats.js
 *
 * To avoid pulling in deps for CSV, the MailChimp export was manually converted
 * to a JS file with the following format:
 *
 * module.exports = { data: ['me@example.com', 'you@example.com'] }
 */
const mongoose = require('mongoose');
const args = require('yargs').argv;
const Client = require('../api/models/Client');
const User = require('../api/models/User');
const env = require('../config/env');
const contacts = require('../tmp/subscribed.js').data;

const { logger } = env;

// Connect to DB.
const { store } = env.database;
mongoose.set('strictQuery', true);
mongoose.connect(store.uri, store.options);

async function run() {
  let hidUsers = [];

  console.log('👤 Total MailChimp subscribers', contacts.length);

  let totalUsers = await User.find();
  console.log('👤 Total HID users', totalUsers.length);

  for (var i = 0; i < contacts.length; i++) {
    // Find users that use known MailChimp addresses.
    await User.findOne({ 'emails.email': contacts[i] }).then((data) => {
      if (data != null) {
        hidUsers.push({
          id: data.id,
          email: data.email,
          clients: data.authorizedClients,
        });
      }
    });
  };

  console.log('👤 MailChimp HID users', hidUsers.length);

  // Scan each user's authorizedClients array for RW production
  let hidRwUsers = hidUsers.filter((user) => {
    return (user.clients.filter((client) => {
      return client.id === 'rw-prod';
    })).length >= 1;
  });

  console.log('👤 MailChimp HID+RW users', hidRwUsers.length);

  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
