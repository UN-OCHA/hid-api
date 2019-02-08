'use strict';

module.exports = {
  database: {
    stores: {
      staging: {
        // should be 'create' or 'drop'
        migrate: 'create',
        uri: 'mongodb://db:27017/staging',
        options: {
          keepAlive: 600000,
          connectTimeoutMS: 60000
        }
      }
    },
    models: {
      defaultStore: 'staging',
      migrate: 'create'
    }
  }
};
