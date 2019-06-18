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
const NotificationService = require('../api/services/NotificationService');

async function run() {
  const now = new Date();
  let populate = '';
  const criteria = {};
  criteria.email_verified = true;
  criteria.$or = [];
  listAttributes.forEach((attr) => {
    const tmp = {};
    tmp[`${attr}.remindedCheckout`] = false;
    criteria.$or.push(tmp);
    populate += ` ${attr}.list`;
  });

  const cursor = User.find(criteria).populate(populate).cursor({ noCursorTimeout: true });

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    for (const listAttribute of listAttributes) {
      for (const lu of user[listAttribute]) {
        try {
          if (lu.checkoutDate && lu.remindedCheckout === false && !lu.deleted) {
            const dep = new Date(lu.checkoutDate);
            if (dep.valueOf() - now.valueOf() < 48 * 3600 * 1000) {
              const notification = { type: 'reminder_checkout', user, params: { listUser: lu, list: lu.list } };
              await NotificationService.send(notification);
              lu.remindedCheckout = true;
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
})().catch(e => {
  console.log(e);
  process.exit(1);
})
