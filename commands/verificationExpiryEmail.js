/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module verificationExpiryEmail
 * @description Sends a verification expiry notification to users who have been verified manually
 * 7 days before their verification expires.
 */
const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const hidAccount = '5b2128e754a0d6046d6c69f2';
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
      if (user._id.toString() !== '58e493543f0e0d00aeec0d16') {
        await EmailService.sendVerificationExpiryEmail(user);
      }
      await User.collection.updateOne(
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

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
