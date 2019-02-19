

const winston = require('winston');
const os = require('os');
const _ = require('lodash');
require('winston-daily-rotate-file');

module.exports = {
  database: {
    stores: {
      staging: {
        // should be 'create' or 'drop'
        migrate: 'create',
        uri: 'mongodb://db:27017/staging',
        options: {
          keepAlive: 600000,
          connectTimeoutMS: 60000,
          useNewUrlParser: true,
        },
      },
    },
    models: {
      defaultStore: 'staging',
      migrate: 'create',
    },
  },
  logger: new winston.Logger({
    level: 'debug',
    exitOnError: false,
    rewriters: [
      (level, msg, ametadata) => {
        let metadata = ametadata;
        let ip = '';
        if (metadata.request && metadata.request.info && metadata.request.info.remoteAddress) {
          ip = metadata.request.info.remoteAddress;
        }
        if (metadata.request && metadata.request.headers && metadata.request.headers['x-forwarded-for']) {
          ip = metadata.request.headers['x-forwarded-for'];
        }
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
        metadata.env = `hid-${process.env.NODE_ENV}`;
        metadata.ip = ip;
        metadata.user = userId;
        metadata['@timestamp'] = new Date().toJSON();

        return metadata;
      },
    ],
    transports: [
      new winston.transports.DailyRotateFile({
        name: 'info-file',
        filename: 'trails/info.log',
        level: 'debug',
        timestamp: true,
      }),
      new winston.transports.DailyRotateFile({
        name: 'error-file',
        filename: 'trails/error.log',
        level: 'error',
        timestamp: true,
      }),
    ],
  }),
};
