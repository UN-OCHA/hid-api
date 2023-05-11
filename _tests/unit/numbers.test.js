'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { afterEach, beforeEach, describe, it } = exports.lab = Lab.script();
const { init } = require('../../server');

describe('GET /api/v3/numbers', () => {
  let server;

  beforeEach(async () => {
    server = await init();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('responds with 403 to unauthenticated request', async () => {
    const res = await server.inject({
      method: 'get',
      url: '/api/v3/numbers'
    });
    expect(res.statusCode).to.equal(403);
  });

  // it('responds with 401 to invalid token', async () => {
  //   const res = await server.inject({
  //     method: 'get',
  //     url: '/api/v3/numbers',
  //     headers: {
  //       Authorization: 'xxx',
  //     }
  //   });
  //   expect(res.statusCode).to.equal(401);
  // });
});
