'use strict';
/* global describe, it */

const assert = require('assert');

describe('Webhooks', () => {
  it('should exist', () => {
    assert(global.app.api.policies.WebhooksPolicy);
  });
});
