const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { hidFormatter } = require('../logs');

const env = process.env.NODE_ENV || 'local';
const databaseUri = process.env.DATABASE || 'mongodb://db:27017/local';
const defaultStore = databaseUri.split('/').pop();
const logLevel = process.env.LOG_LEVEL || 'debug';

const loggerInfo = new DailyRotateFile({
  name: 'info-file',
  filename: 'logs/info.log',
  level: logLevel,
  timestamp: true,
});

const loggerError = new DailyRotateFile({
  name: 'error-file',
  filename: 'logs/error.log',
  level: 'error',
  timestamp: true,
});

const loggerConsole = new winston.transports.Console();

const loggerLocal = new winston.transports.File({
  filename: '/var/log/local.log',
  timestamp: true,
});

const transports = [];

if (env === 'local') {
  transports.push(loggerConsole, loggerLocal);
} else {
  transports.push(loggerInfo, loggerError);
}

const allowedDomains = ['http://hid.test'];

if (process.env.ALLOWED_DOMAINS) {
  allowedDomains.push(...process.env.ALLOWED_DOMAINS.split(','));
}

const config = {
  env,
  allowedDomains,
  database: {
    store: {
      migrate: 'create',
      uri: databaseUri,
      options: {
        connectTimeoutMS: 60000,
      },
    },
    models: {
      defaultStore,
      migrate: 'create',
    },
  },
  logger: winston.createLogger({
    level: logLevel,
    exitOnError: false,
    format: winston.format.combine(
      hidFormatter(),
      winston.format.json(),
    ),
    transports,
  }),
};

module.exports = config;
