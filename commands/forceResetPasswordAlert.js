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
  const fiveMonths = new Date(current - 5 * 30 * 24 * 3600 * 1000);
  const cursor = User.find({
    totp: false,
    passwordResetAlert30days: false,
    $or: [{ lastPasswordReset: { $lte: fiveMonths } }, { lastPasswordReset: null }],
  }).cursor({ noCursorTimeout: true });

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    if (user.email) {
      await EmailService.sendForcedPasswordResetAlert(user);
      await User.collection.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetAlert30days: true,
          },
        },
      );
    }
  }
  process.exit();
}

(async function () {
  await run();
})().catch(e => {
  console.log(e);
  process.exit(1);
})
