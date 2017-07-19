'use strict';

module.exports = {
  database: {
    stores: {
      development: {
        // should be 'create' or 'drop'
        migrate: 'create',
        uri: 'mongodb://db:27017/development',
        options: {
          server: {
            socketOptions: {
              keepAlive: 600000,
              connectTimeoutMS: 60000
            }
          }
        }
      }
    },
    models: {
      defaultStore: 'development',
      migrate: 'create'
    }
  }
};
