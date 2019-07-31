

module.exports = {
  trailpack: {
    disabled: [
      'repl',
    ],
  },

  hrInfo: 'www.humanitarianresponse.info',
  database: {
    stores: {
      testing: {
        migrate: 'create',
        uri: 'mongodb://127.0.0.1/testing',
        options: {
          keepAlive: 600000,
          connectTimeoutMS: 60000,
          useNewUrlParser: true,
        },
      },
    },
    models: {
      migrate: 'create',
    },
  },
};
