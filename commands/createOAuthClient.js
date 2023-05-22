/**
 * @module createOAuthClient
 * @description Create OAuth client.
 *
 * docker-compose exec dev node ./commands/createOAuthClient.js
 */
const mongoose = require('mongoose');
const args = require('yargs').argv;
const Client = require('../api/models/Client');
const env = require('../config/env');

const { logger } = env;

// Connect to DB.
const store = env.database.store;
mongoose.connect(store.uri, store.options);

// Generate a random secret each time we run the command
const idChars = 'abcdefghijklmnopqrstuvwxyz';
const secretChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
let suffix = '';
let secret = '';
for (let i = 0; i < 36; i++) {
  suffix += idChars.charAt(Math.floor(Math.random() * idChars.length));
  secret += secretChars.charAt(Math.floor(Math.random() * secretChars.length));
}

async function run() {
  const clientInfo = {
    id: `change-me-${suffix.substring(0, 6)}`,
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
