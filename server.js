/**
 * @module server
 *
 * Start up the Trails Application.Test
 */

'use strict';

const app = require('./');
const _ = require('lodash');
const mongoose = require('mongoose');
const Hapi = require('hapi');

const store = app.config.env[process.env.NODE_ENV].database.stores[process.env.NODE_ENV];
mongoose.connect(store.uri, store.options);

const webConfig = app.config.web;
webConfig.views.relativeTo = app.config.main.paths.root

_.defaultsDeep(webConfig.options, {
  host: webConfig.host,
  port: webConfig.port,
  routes: {
    files: {
      relativeTo: webConfig.views.relativeTo
    }
  }
});

const server = Hapi.server(webConfig.options);
const init = async () => {

  // Plugins
  await server.register(webConfig.plugins);
  webConfig.onPluginsLoaded();

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
  server.views(app.config.views);

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
