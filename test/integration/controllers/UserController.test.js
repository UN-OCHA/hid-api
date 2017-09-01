'use strict';
/* global describe, it */

const assert = require('assert');

describe('UserController', () => {
  let server;
  before(() => {
    server = global.app.packs.hapi.server;
  });

  it('should not allow an unauthenticated user to see a user profile', () => {
    return server.inject({method: 'GET', url: '/api/v2/user/123456'})
      .then(res => {
        assert.equal(res.statusCode, 401);
      });
  });
});
