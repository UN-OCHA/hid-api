/* eslint no-await-in-loop: "off", no-restricted-syntax: "off", no-console: "off" */
/* eslint func-names: "off" */
/**
 * @module setListCounts
 * @description Resets the list counters.
 */

const mongoose = require('mongoose');
const app = require('../');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const List = require('../api/models/List');

async function setListCount(list) {
  await list.computeCounts();
  return list.save();
}

async function run() {
  const cursor = List.find({ deleted: false }).cursor({ noCursorTimeout: true });
  const promises = [];
  for (let list = await cursor.next(); list != null; list = await cursor.next()) {
    promises.push(setListCount(list));
  }
  await Promise.all(promises);
  process.exit();
}

(async function () {
  await run();
}()).catch((e) => {
  console.log(e);
  process.exit(1);
});
