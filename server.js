/**
 * @module server
 *
 * Start up the Trails Application.
 */

'use strict';

const app = require('./');
const TrailsApp = require('trails');
const server = new TrailsApp(app);

server
  .start()
  .catch(err => {
    console.log(err);
    console.trace();
  });
