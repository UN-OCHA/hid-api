/**
 * @module server
 *
 * Start up the Trails Application.Test
 */

const newrelic = require('newrelic');
const path = require('path');
const _ = require('lodash');
const mongoose = require('mongoose');
const Boom = require('@hapi/boom');
const hapi = require('hapi');
const ejs = require('ejs');
const app = require('./');
const config = require('./config/env')[process.env.NODE_ENV];

const { logger } = config;

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const webConfig = app.config.web;

_.defaultsDeep(webConfig.options, {
  host: webConfig.host,
  port: webConfig.port,
  routes: {
    files: {
      relativeTo: app.config.main.paths.root,
    },
  },
});

const preResponse = (request, reply) => {
  const { response } = request;
  if (!response.isBoom) {
    return reply.continue;
  }

  if (response.name && response.name === 'ValidationError') {
    logger.error('Validation error', { request, error: response.toString() });
    throw Boom.badRequest(response.message);
  }
  if (response.output.statusCode === 500) {
    logger.error('Unexpected error', { request, error: response.toString() });
    if (process.env.NODE_ENV !== 'local') {
      // Send the error to newrelic
      newrelic.noticeError(response.toString());
    }
  }
  return reply.continue;
};

const server = hapi.Server(webConfig.options);
const init = async () => {
  // Plugins
  await server.register(webConfig.plugins);
  webConfig.onPluginsLoaded(server);

  server.auth.strategy('hid', 'hapi-auth-hid');

  server.auth.default('hid');

  // Routes
  server.route(app.config.routes);
  if (Array.isArray(app.config.main.paths.www)) {
    app.config.main.paths.www.map((item) => {
      const staticDir = path.relative(app.config.main.paths.root, item.path);
      return server.route({
        method: 'GET',
        path: item.humanUrl
          ? item.humanUrl.concat('/{filename*}')
          : '/'.concat(staticDir.replace(/\\/g, '/'), '/{filename*}'),
        handler: {
          file(request) {
            return path.join(staticDir, request.params.filename);
          },
        },
        config: {
          auth: false,
        },
      });
    });
  } else {
    const staticDir = path.relative(app.config.main.paths.root, app.config.main.paths.www);
    server.route({
      method: 'GET',
      path: '/'.concat(staticDir.replace(/\\/g, '/'), '/{filename*}'),
      handler: {
        file(request) {
          return path.join(staticDir, request.params.filename);
        },
      },
      config: {
        auth: false,
      },
    });
  }

  // Views
  server.views({
    engines: {
      html: ejs,
    },
    relativeTo: __dirname,
    path: 'templates',
  });

  server.ext('onPreResponse', preResponse);

  await server.start();
  // console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  if (process.env.NODE_ENV !== 'local') {
    newrelic.noticeError(err);
  }
  logger.error('[unhandledRejection] Unhandled rejection error', err);
  process.exit(1);
});

init();
