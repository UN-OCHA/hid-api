const winston = require('winston');
const { hidFormatter } = require('../logs');
const DailyRotateFile = require('winston-daily-rotate-file');

module.exports = {
  env: 'development',
  database: {
    stores: {
      development: {
        migrate: 'create',
        uri: 'mongodb://db:27017/development',
        options: {
          keepAlive: 600000,
          connectTimeoutMS: 60000,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useFindAndModify: false,
          usecreateIndex: true,
        },
      },
    },
    models: {
      defaultStore: 'development',
      migrate: 'create',
    },
  },
  logger: winston.createLogger({
    level: 'debug',
    exitOnError: false,
    format: winston.format.combine(
      hidFormatter(),
      winston.format.json(),
    ),
    transports: [
      new DailyRotateFile({
        name: 'info-file',
        filename: 'trails/info.log',
        level: 'debug',
        timestamp: true,
      }),
      new DailyRotateFile({
        name: 'error-file',
        filename: 'trails/error.log',
        level: 'error',
        timestamp: true,
      }),
    ],
  }),
};
