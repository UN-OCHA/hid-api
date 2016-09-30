/**
 * Database Configuration
 * (app.config.database)
 *
 * Configure the ORM layer, connections, etc.
 *
 * @see {@link http://trailsjs.io/doc/config/database}
 */
module.exports = {

  /**
   * Define the database stores. A store is typically a single database.
   *
   * Set production connection info in config/env/production.js
   */
  stores: {

    development: {
      // should be 'create' or 'drop'
      migrate: 'create',

      uri: 'mongodb://db:27017/hid',

      options: {}
    },

    testing: {
      migrate: 'drop',
      uri: 'mongodb://db:27017/testing',
      options: {}
    }
  },

  models: {
    defaultStore: 'development',
    migrate: 'create'
  }
}
