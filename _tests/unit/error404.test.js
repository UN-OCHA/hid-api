const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const { setup, init } = require('../../server');

const { afterEach, before, beforeEach, describe, it } = exports.lab = Lab.script();

describe('404 Responses', () => {
  let server;

  // Only the first alphabetical test needs to run setup.
  before(async () => {
    server = await setup();
  });

  beforeEach(async () => {
    server = await init();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('responds with JSON by default', async () => {
    const res = await server.inject({
      method: 'get',
      url: '/notfound',
      headers: {
        Accept: '*/*',
      },
    });
    expect(res.statusCode).to.equal(404);
    expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
  });

  it('responds with HTML when Accept header includes it', async () => {
    const res = await server.inject({
      method: 'get',
      url: '/notfound',
      headers: {
        Accept: 'text/html',
      },
    });
    expect(res.statusCode).to.equal(404);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
  });
});
