'use strict';

const mongoose = require('mongoose');
const { Schema, connection } = mongoose;
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
  criteriaVisible[`${list.type}s`] = { $elemMatch: { list: list._id, deleted: false } };
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
  const count = await List.countDocuments({ deleted: false });
  const cursor = List.find({ deleted: false }).cursor();
  let index = 0;
  while (index < count) {
    const batchStop = index + 100;
    const promises = [];
    while (index < batchStop) {
      const list = await cursor.next();
      if (list === null) {
        index = count;
      }
      else {
        promises.push(setListCount(list));
        index++;
      }
    }
    console.log('awaiting' + index);
    try {
      await Promise.all(promises);
    }
    catch (err) {
      console.log(err);
    }
  }
}

setListCounts();
