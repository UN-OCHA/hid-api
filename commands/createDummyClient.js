/**
 * @module createDummyClient
 * @description Create dummy client.
 *
 * docker-compose exec dev node ./commands/createDummyClient.js
 */
const mongoose = require('mongoose');
const args = require('yargs').argv;
const app = require('../');

const store = app.config.env.database.store;
mongoose.connect(store.uri, store.options);

const Client = require('../api/models/Client');

async function run() {
  const clientInfo = {
    id: 'client',
    name: 'client',
    secret: 'clientsecret',
    url: 'https://example.com/',
    redirectUrls: ['https://example.com/user/login/hid/callback'],
  };

  if (args.id) {
    clientInfo.id = args.id;
  }

  if (args.name) {
    clientInfo.name = args.name;
  }

  if (args.secret) {
    clientInfo.secret = args.secret;
  }

  if (args.url) {
    clientInfo.url = args.url;
  }

  if (args.redirectUrl) {
    clientInfo.redirectUrls = [args.redirectUrl];
  }

  await Client.create(clientInfo);

  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
