const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { setup, init } = require('../../server');

const { afterEach, before, beforeEach, describe, it } = exports.lab = Lab.script();

describe('Session enforcement', () => {
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

  it('redirects to homepage when requesting logged-in pages as anonymous', async () => {
    const res = await server.inject({
      method: 'get',
      url: '/profile',
    });
    expect(res.statusCode).to.equal(302);
    expect(res.headers.location).to.equal('/');
  });
});
