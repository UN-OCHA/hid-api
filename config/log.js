/**
 * Logging Configuration
 * (app.config.log)
 *
 * @see http://trailsjs.io/doc/config/log
 */

'use strict';

const winston = require('winston');

module.exports = {

  /**
   * Specify the logger to use.
   * @see https://github.com/winstonjs/winston#instantiating-your-own-logger
   *
   * Exposed on app.log
   */
  logger: new winston.Logger({
    level: 'debug',
    exitOnError: false,
    transports: [
      new (winston.transports.Console)({
        prettyPrint: true,
        colorize: true,
        timestamp: function() {
          const d = new Date();
          return d.toUTCString();
        },
        formatter: function(options) {
          // Return string will be passed to logger.
          let meta = options.meta;
          if (meta.request) {
            meta.ip = meta.request.headers['x-forwarded-for'] ? meta.request.headers['x-forwarded-for'] : '';
            if (meta.request.params && meta.request.params.currentUser) {
              meta.email = meta.request.params.currentUser.email;
            }
            delete meta.request;
          }
          if (meta.security) {
            options.message = '[SECURITY] ' + options.message;
            delete meta.security;
          }
          if (meta.fail) {
            options.message = '[FAIL] ' + options.message;
            delete meta.fail;
          }
          return '[' + options.timestamp() + '] ' + options.level.toUpperCase() + ' ' + (options.message ? options.message : '') +
            (meta && Object.keys(meta).length ? '\n\t' + JSON.stringify(meta) : '' );
        }
      })
    ]
  })

};
