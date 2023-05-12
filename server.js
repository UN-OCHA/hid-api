/**
 * @module server
 */

const path = require('path');
const _ = require('lodash');
const mongoose = require('mongoose');
const Boom = require('@hapi/boom');
const hapi = require('@hapi/hapi');
const ejs = require('ejs');
const app = require('./app');
const env = require('./config/env');

const { logger } = env;
const { store } = env.database;

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
  }
  return reply.continue;
};

// Define server
const server = hapi.Server(webConfig.options);

// Define server init
exports.init = async () => {
  // Plugins
  await server.register(webConfig.plugins);
  webConfig.onPluginsLoaded(server);
  server.auth.strategy('hid', 'hapi-auth-hid');
  server.auth.default('hid');

  // Define routes
  server.route(app.config.routes);

  // Define static assets
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

  await server.initialize();

  return server;
};

// Define server start
exports.start = async () => {
  // Connect to DB
  mongoose.connect(store.uri, store.options);

  await server.start();

  logger.info(
    `HID server started. Listening on: ${server.info.uri}`,
  );

  logger.info(
    `node.js version ${process.version}`,
    {
      security: true,
    },
  );

  return server;
};

// Unhandled errors
process.on('unhandledRejection', (err, p) => {
  logger.error('[unhandledRejection] Unhandled rejection error', err, p);
  process.exit(1);
});
