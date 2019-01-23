/**
 * @module server
 *
 * Start up the Trails Application.Test
 */

'use strict';

const app = require('./');
const TrailsApp = require('trails');
const mongoose = require('mongoose');
const server = new TrailsApp(app);

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

if (process.env.NODE_ENV !== 'testing') {
  const newrelic = require('newrelic');
  server
    .start()
    .catch(err => {
      newrelic.noticeError(err);
    });
}
else {
  server
    .start();
}
