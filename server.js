/**
 * @module server
 *
 * Start up the Trails Application.Test
 */

'use strict';

const app = require('./');
const path = require('path');
const _ = require('lodash');
const mongoose = require('mongoose');
const Boom = require('boom');
const Hapi = require('hapi');
const config = require('./config/env')[process.env.NODE_ENV];
const logger = config.logger;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const webConfig = app.config.web;

_.defaultsDeep(webConfig.options, {
  host: webConfig.host,
  port: webConfig.port,
  routes: {
    files: {
      relativeTo: app.config.main.paths.root
    }
  }
});

const preResponse = function (request, reply) {
  const response = request.response;
  if (!response.isBoom) {
    return reply.continue;
  }
  else {
    if (response.name && response.name === 'ValidationError') {
      logger.error('Validation error', {request: request, error: response.toString()});
      throw Boom.badRequest(response.message);
    }
    if (response.output.statusCode === 500) {
      logger.error('Unexpected error', {request: request, error: response.toString()});
      if (process.env.NODE_ENV !== 'testing') {
        const newrelic = require('newrelic');
        // Send the error to newrelic
        newrelic.noticeError(response.toString());
      }
    }
    return reply.continue;
  }
};

const server = Hapi.Server(webConfig.options);
const init = async () => {

  // Plugins
  await server.register(webConfig.plugins);
  //webConfig.onPluginsLoaded(server);

  server.auth.strategy('hid', 'hapi-auth-hid');

  server.auth.default('hid');

  // Routes
  server.route(app.config.routes);
  if (Array.isArray(app.config.main.paths.www)) {
    app.config.main.paths.www.map(item =>{
      const staticDir = path.relative(app.config.main.paths.root, item.path)
      server.route({
        method: 'GET',
        path: item.humanUrl ?
          item.humanUrl.concat('/{filename*}') :
          '/'.concat(staticDir.replace(/\\/g, '/'), '/{filename*}'),
        handler: {
          file: function(request) {
            return path.join(staticDir, request.params.filename)
          }
        }
      })
    })
  }
  else {
    const staticDir = path.relative(app.config.main.paths.root, app.config.main.paths.www)
    server.route({
      method: 'GET',
      path: '/'.concat(staticDir.replace(/\\/g, '/'), '/{filename*}'),
      handler: {
        file: function(request) {
          return path.join(staticDir, request.params.filename)
        }
      }
    })
  }

  // Views
  server.views({
    engines: {
      html: require('ejs')
    },
    relativeTo: __dirname,
    path: 'templates'
  });

  server.ext('onPreResponse', preResponse);

  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  if (process.env.NODE_ENV !== 'testing') {
    const newrelic = require('newrelic');
    newrelic.noticeError(err);
  }
  console.log(err);
  process.exit(1);
});

init();
