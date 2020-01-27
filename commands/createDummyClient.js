/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */

/**
 * @module migrateRedirectUrls
 * @description Migrates the redirect URLs to an array to allow for multiple redirect URLs
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
    url: 'https://iasc8.local.docksal/',
    redirectUrls: ['https://iasc8.local.docksal/user/login/hid/callback']
  };

  await Client.create(clientInfo);

  const cursor = Client.find({ }).cursor({ noCursorTimeout: true });

  // Loop through each client in the database.
  for (let client = await cursor.next(); client != null; client = await cursor.next()) {
    console.log(client.name);
  }

  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
