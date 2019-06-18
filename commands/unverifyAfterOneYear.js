const mongoose = require('mongoose');
const app = require('../');
const config = require('../config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const User = require('../api/models/User');

async function run() {
  const current = Date.now();
  const oneYear = new Date(current - 365 * 24 * 3600 * 1000);
  const cursor = User.find({
    verified: true,
    verifiedOn: { $lte: oneYear },
    verificationExpiryEmail: true,
    verified_by: { $ne: hidAccount },
  }).cursor({ noCursorTimeout: true });

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    await User.collection.update(
      { _id: user._id },
      {
        $set: {
          verified: false,
          verifiedOn: new Date(0, 0, 1, 0, 0, 0),
          verified_by: null,
        },
      },
    );
  }
  process.exit();
}

run();
