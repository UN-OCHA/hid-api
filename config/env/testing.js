

module.exports = {
  env: 'testing',
  database: {
    store: {
      migrate: 'create',
      uri: 'mongodb://127.0.0.1/testing',
      options: {
        keepAlive: 600000,
        connectTimeoutMS: 60000,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      },
    },
    models: {
      migrate: 'create',
    },
  },
};
