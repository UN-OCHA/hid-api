'use strict';

module.exports = {
  database: {
    stores: {
      local: {
        migrate: 'create',
        uri: 'mongodb://db:27017/local',
        options: {}
      }
    },
    models: {
      defaultStore: 'local',
      migrate: 'create'
    }
  }
};
