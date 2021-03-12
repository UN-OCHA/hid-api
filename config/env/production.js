const winston = require('winston');
const { hidFormatter } = require('../logs');
require('winston-daily-rotate-file');

module.exports = {
  database: {
    stores: {
      production: {
        migrate: 'create',
        uri: process.env.DATABASE,
        options: {
          keepAlive: 600000,
          connectTimeoutMS: 60000,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          useFindAndModify: false,
          useCreateIndex: true,
        },
      },
    },
    models: {
      defaultStore: 'production',
      migrate: 'create',
    },
  },
  logger: winston.createLogger({
    level: 'info',
    exitOnError: false,
    format: winston.format.combine(
      hidFormatter(),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.DailyRotateFile({
        name: 'info-file',
        filename: 'trails/info.log',
        level: 'info',
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
