/**
 * @module migrateRedirectUrls
 * @description Migrates the redirect URLs to an array to allow for multiple redirect URLs
 */
const mongoose = require('mongoose');
const app = require('..');

const store = app.config.env.database.store;
mongoose.connect(store.uri, store.options);

const Client = require('../api/models/Client');

async function run() {
  const cursor = Client.find({ }).cursor({ noCursorTimeout: true });

  // Loop through each client in the database
  for (let client = await cursor.next(); client != null; client = await cursor.next()) {
    if (client.redirectUrls.length === 0) {
      client.redirectUrls = [];
      // Add their primary redirectUri to the array of redirect Urls
      client.redirectUrls.push(client.redirectUri);
      client.markModified('redirectUrls');
      // Save the client
      await client.save();
    }
  }
  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
