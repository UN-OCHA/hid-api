/* eslint no-await-in-loop: "off", no-restricted-syntax: "off" */

const mongoose = require('mongoose');
const app = require('../../');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const User = require('../models/User');
const List = require('../models/List');

async function setListCount(list) {
  const criteriaAll = { };
  criteriaAll[`${list.type}s`] = { $elemMatch: { list: list._id, deleted: false } };
  const criteriaVisible = { };
  criteriaVisible[`${list.type}s`] = { $elemMatch: { list: list._id, deleted: false, pending: false } };
  criteriaVisible.authOnly = false;
  const [numberTotal, numberVisible] = await Promise.all([
    User.countDocuments(criteriaAll),
    User.countDocuments(criteriaVisible),
  ]);
  const flist = list;
  flist.count = numberTotal;
  flist.countVisible = numberVisible;
  return flist.save();
}

async function setListCounts() {
  const cursor = List.find({ deleted: false }).cursor();
  const promises = [];
  for (let list = await cursor.next(); list != null; list = await cursor.next()) {
    promises.push(setListCount(list));
  }
  try {
    await Promise.all(promises);
  } catch (err) {
    logger.error(err);
  }
}

setListCounts();
