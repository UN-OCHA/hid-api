// test/index.js

const Trails = require('trails');

before(() => {
  global.app = new Trails(require('../'));
  return global.app.start().catch(global.app.stop);
});
after(() => {
  return global.app.stop();
});
