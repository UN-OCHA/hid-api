/**
 * @module createOAuthClient
 * @description Create OAuth client.
 *
 * docker-compose exec dev node ./commands/createOAuthClient.js
 */
const mongoose = require('mongoose');
const args = require('yargs').argv;
const app = require('../');
const config = require('../config/env');

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.store;
mongoose.connect(store.uri, store.options);

const Client = require('../api/models/Client');

// Generate a random secret each time we run the command
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
let secret = '';
for (let i = 0; i < 36; i++) {
  secret += chars.charAt(Math.floor(Math.random() * chars.length));
}

async function run() {
  const clientInfo = {
    id: 'change-me',
    name: 'CHANGE ME',
    secret,
    url: 'https://example.com/',
    redirectUri: 'https://example.com/user/login/hid/callback',
  };

  // Customize the input if arguments were sent
  if (args.id) {
    clientInfo.id = args.id;
  }
  if (args.name) {
    clientInfo.name = args.name;
  }
  if (args.url) {
    clientInfo.url = args.url;
  }
  if (args.redirectUri) {
    clientInfo.redirectUri = args.redirectUri;
  }

  // Attempt to create new OAuth client and log the result.
  await Client.create(clientInfo).then((data) => {
    logger.info(
      '[commands->createOAuthClient] created new OAuth client',
      {
        security: true,
        oauth: {
          client_id: data.id,
        },
      },
    );
  }).catch((err) => {
    logger.warn(
      '[commands->createOAuthClient] failed to create new OAuth client',
      {
        security: true,
        fail: true,
        oauth: {
          client_id: clientInfo.id,
        },
        stack_trace: err.stack,
      },
    );
  });

  process.exit();
}

(async function iife() {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
