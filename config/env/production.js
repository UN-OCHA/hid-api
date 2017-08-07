'use strict';

const winston = require('winston');
const os = require('os');
const _ = require('lodash');

module.exports = {

  database: {
    stores: {
      production: {
        migrate: 'create',
        uri: process.env.DATABASE,
        options: {
          server: {
            socketOptions: {
              keepAlive: 600000,
              connectTimeoutMS: 60000
            }
          }
        }
      }
    },
    models: {
      defaultStore: 'production',
      migrate: 'create'
    }
  },

  trailpack: {
    disabled: [
      'repl'
    ]
  },

  log: {
    logger: new winston.Logger({
      level: 'info',
      exitOnError: false,
      rewriters: [
        function (level, msg, metadata) {
          delete metadata.request;

          // Keep original metadata safe.
          metadata = _.clone(metadata || {});

          // Extend metadata with some default.
          metadata.level = level;
          metadata.hostname = os.hostname();
          metadata.env = 'hid-' + process.env.NODE_ENV;
          metadata['@timestamp'] = new Date().toJSON();

          return metadata;
        }
      ],
      transports: [
        new winston.transports.Console({
          timestamp: true
        }),
        new winston.transports.File({
          name: 'info-file',
          level: 'info',
          filename: 'trails-info.log',
          timestamp: true
        }),
        new winston.transports.File({
          name: 'error-file',
          level: 'error',
          filename: 'trails-error.log',
          timestamp: true
        })
      ]
    })
  }

};
