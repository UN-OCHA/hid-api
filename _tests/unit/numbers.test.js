const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { setup, init } = require('../../server');

const { afterEach, before, beforeEach, describe, it } = exports.lab = Lab.script();

describe('GET /api/v3/numbers', () => {
  let server;

  // Only the first alphabetical test needs to run setup.
  // before(async () => {
  //   server = await setup();
  // });

  beforeEach(async () => {
    server = await init();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('responds with 403 to unauthenticated request', async () => {
    const res = await server.inject({
      method: 'get',
      url: '/api/v3/numbers',
    });
    expect(res.statusCode).to.equal(403);
  });

  it('responds with 401 to invalid token', async () => {
    const res = await server.inject({
      method: 'get',
      url: '/api/v3/numbers',
      headers: {
        Authorization: 'invalid_token',
      },
    });
    expect(res.statusCode).to.equal(401);
  });
});
