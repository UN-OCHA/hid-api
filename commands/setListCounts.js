/* eslint no-await-in-loop: "off", no-restricted-syntax: "off" */

const mongoose = require('mongoose');
const app = require('../');
const config = require('../config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const List = require('../api/models/List');

async function setListCount(list) {
  await list.computeCounts();
  return list.save();
}

async function setListCounts() {
  try {
    const cursor = List.find({ deleted: false }).cursor({ noCursorTimeout: true });
    const promises = [];
    for (let list = await cursor.next(); list != null; list = await cursor.next()) {
      promises.push(setListCount(list));
    }
    await Promise.all(promises);
    process.exit();
  } catch (err) {
    logger.error(err);
    process.exit();
  }
}

setListCounts();
