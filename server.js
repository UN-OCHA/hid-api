/**
 * @module server
 *
 * Start up the Trails Application.
 */

'use strict';

const app = require('./');
const TrailsApp = require('trails');
const server = new TrailsApp(app);

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
