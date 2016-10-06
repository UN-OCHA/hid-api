// config/caches.js
module.exports = {
  stores: [
  // Example for redis Store
  /*{
    name: 'my-redis-store',
    type: 'redis',
    host: 'localhost',
    auth_pass: ''
    db: 0,
    ttl: 600 // Default TTL
  },
  // Example for memory store
  {
    name: 'memory-store',
    type: 'memory',
    max: 100,
    ttl: 60
  },*/
  // Example for mongo store
  {
    name: 'local-cache',
    type: 'mongodb',
    options: {
      host: 'db',
      port: '27017',
      database: 'local',
      collection: 'cache',
      compression: false,
      server: {
        poolSize: 5,
        auto_reconnect: true
      }
    }
  }],

  defaults: ['local-cache']
}
