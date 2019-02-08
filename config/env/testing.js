'use strict';

module.exports = {

  trailpack: {
    disabled: [
      'repl'
    ]
  },

  database: {
    stores: {
      testing: {
        migrate: 'create',
        uri: 'mongodb://127.0.0.1/testing',
        options: {
          keepAlive: 600000,
          connectTimeoutMS: 60000
        }
      }
    },
    models: {
      migrate: 'create'
    }
  }
};
