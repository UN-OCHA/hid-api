/* eslint no-await-in-loop: "off", no-restricted-syntax: "off" */
const mongoose = require('mongoose');
const app = require('../');
const config = require('../config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const hidAccount = '5b2128e754a0d6046d6c69f2';
const User = require('../api/models/User');
const ListUserController = require('../api/controllers/ListUserController');

async function run() {
  const cursor = User.find({}).cursor({ noCursorTimeout: true });

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    const promises = [];
    user.emails.forEach((email) => {
      if (email.validated) {
        promises.push(user.isVerifiableEmail(email.email));
      }
    });
    const domains = await Promise.all(promises);
    for (const domain in domains) {
      if (domain) {
        user.verified = true;
        user.verified_by = hidAccount;
        if (!user.verified) {
          user.verifiedOn = new Date();
        }
        // If the domain is associated to a list, check user in this list automatically
        if (domain.list) {
          if (!user.organizations) {
            user.organizations = [];
          }

          let isCheckedIn = false;
          // Make sure user is not already checked in this list
          for (let i = 0, len = user.organizations.length; i < len; i += 1) {
            if (user.organizations[i].list.equals(domain.list._id)
              && user.organizations[i].deleted === false) {
              isCheckedIn = true;
            }
          }

          if (!isCheckedIn) {
            await ListUserController.checkinHelper(domain.list, user, true, 'organizations', user);
          }
        }
        await user.save();
      }
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
