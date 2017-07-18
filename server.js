/**
 * @module server
 *
 * Start up the Trails Application.
 */

'use strict';

const newrelic = require('newrelic');

const app = require('./');
const TrailsApp = require('trails');
const server = new TrailsApp(app);

server
  .start()
  .catch(err => {
    newrelic.noticeError(err);
  });
