/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module doAutomatedCheckout
 * @description Checks users out of lists automatically 24 hours after their set departure date.
 */
const mongoose = require('mongoose');
const app = require('../');
const config = require('../config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const listAttributes = [
  'lists',
  'operations',
  'bundles',
  'disasters',
  'organizations',
  'functional_roles',
];
const User = require('../api/models/User');

async function run() {
  let populate = '';
  const criteria = {};
  criteria.email_verified = true;
  criteria.$or = [];
  listAttributes.forEach((attr) => {
    const tmp = {};
    tmp[`${attr}.remindedCheckout`] = true;
    criteria.$or.push(tmp);
    populate += ` ${attr}.list`;
  });

  const now = Date.now();
  const cursor = User.find(criteria).populate(populate).cursor({ noCursorTimeout: true });

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    for (const listAttribute of listAttributes) {
      for (const lu of user[listAttribute]) {
        try {
          if (lu.checkoutDate && lu.remindedCheckout === true && !lu.deleted) {
            const dep = new Date(lu.checkoutDate);
            if (now.valueOf() - dep.valueOf() > 24 * 3600 * 1000) {
              lu.deleted = true;
              await user.save();
            }
          }
        } catch (err) {
          logger.error(err);
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
