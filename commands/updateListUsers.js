/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module updateListUsers
 * @description Updates all checkins for all users to make sure the attributes
 * are updated with their respective lists.
 */

const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const User = require('../api/models/User');

async function run() {
  const childAttributes = User.listAttributes();
  const cursor = User
    .find({})
    .populate([{ path: 'lists.list' },
      { path: 'operations.list' },
      { path: 'bundles.list' },
      { path: 'disasters.list' },
      { path: 'organization.list' },
      { path: 'organizations.list' },
      { path: 'offices.list' },
    ])
    .cursor();

  /* eslint no-await-in-loop: "off" */
  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    for (let i = 0; i < childAttributes.length; i += 1) {
      const childAttribute = childAttributes[i];
      let lu = {};
      if (childAttribute === 'organization') {
        lu = user[childAttribute];
        if (lu && lu.list && lu.list.owner) {
          lu.owner = lu.list.owner;
          lu.managers = lu.list.managers;
          // logger.info(`Updated list for ${user._id.toString()}`);
          /* eslint no-await-in-loop: "off" */
          await user.save();
        } // else {
        // logger.info(`No list for ${user._id.toString()}`);
        // }
      } else {
        for (let j = 0; j < user[childAttribute].length; j += 1) {
          if (lu && lu.list && lu.list.owner) {
            lu.owner = lu.list.owner;
            lu.managers = lu.list.managers;
            // logger.info(`Updated list for ${user._id.toString()}`);
            /* eslint no-await-in-loop: "off" */
            await user.save();
          } // else {
          // logger.info(`No list for ${user._id.toString()}`);
          // }
        }
      }
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
