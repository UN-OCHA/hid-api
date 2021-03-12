const winston = require('winston');
const { hidFormatter } = require('../logs');

module.exports = {
  database: {
    stores: {
      local: {
        migrate: 'create',
        uri: 'mongodb://db:27017/local',
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
      defaultStore: 'local',
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
      new winston.transports.Console(),
      new winston.transports.File({
        filename: '/var/log/local.log',
        timestamp: true,
      }),
    ],
  }),
};
