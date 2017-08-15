/**
 * Logging Configuration
 * (app.config.log)
 *
 * @see http://trailsjs.io/doc/config/log
 */

'use strict';

const winston = require('winston');
const os = require('os');
const _ = require('lodash');

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
      new (winston.transports.Console)()
    ]
  })

};
