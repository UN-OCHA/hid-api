

module.exports = {
  database: {
    stores: {
      testing: {
        migrate: 'create',
        uri: 'mongodb://127.0.0.1/testing',
        options: {
          keepAlive: 600000,
          connectTimeoutMS: 60000,
          useNewUrlParser: true,
          useUnifiedTopology: true,
        },
      },
    },
    models: {
      migrate: 'create',
    },
  },
};
