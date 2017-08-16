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
          const ip = metadata.request ? metadata.request.headers['x-forwarded-for'] || metadata.request.info.remoteAddress : '';
          let userId = '';
          if (metadata.request && metadata.request.params && metadata.request.params.currentUser) {
            userId = metadata.request.params.currentUser._id.toString();
          }
          delete metadata.request;

          // Keep original metadata safe.
          metadata = _.clone(metadata || {});

          // Extend metadata with some default.
          metadata.level = level;
          metadata.hostname = os.hostname();
          metadata.env = 'hid-' + process.env.NODE_ENV;
          metadata.ip = ip;
          metadata.user = userId;
          metadata['@timestamp'] = new Date().toJSON();

          return metadata;
        }
      ],
      transports: [
        new winston.transports.Console({
          timestamp: true
        }),
        new winston.transports.DailyRotateFile({
          filename: './log',
          datePattern: 'yyyy-MM-dd',
          prepend: true,
          level: 'info'
        })
      ]
    })
  }

};
