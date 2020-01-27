/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */

/**
 * @module createDummyClient
 * @description Create dummy client.
 *
 * docker-compose exec dev node ./commands/createDummyClient.js
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const Client = require('../api/models/Client');

async function run() {

  let clientInfo = {
    id: 'client',
    name: 'client',
    secret: 'clientsecret',
    url: 'https://example.com/',
    redirectUrls: ['https://example.com/user/login/hid/callback']
  };

  await Client.create(clientInfo);

  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
