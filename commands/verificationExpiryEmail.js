const mongoose = require('mongoose');
const app = require('../');
const config = require('../config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const User = require('../api/models/User');
const EmailService = require('../api/services/EmailService');

async function run() {
  const current = Date.now();
  const oneYear = new Date(current - 358 * 24 * 3600 * 1000);
  const cursor = User.find({
    verified: true,
    verifiedOn: { $lte: oneYear },
    verified_by: { $ne: hidAccount },
    verificationExpiryEmail: false,
  }).cursor({ noCursorTimeout: true });

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    if (user.email) {
      await EmailService.sendVerificationExpiryEmail(user);
      await User.collection.update(
        { _id: user._id },
        {
          $set: {
            verificationExpiryEmail: true,
          },
        },
      );
    }
  }
  process.exit();
}

run();
