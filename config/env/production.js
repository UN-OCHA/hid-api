'use strict';

const winston = require('winston');

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
