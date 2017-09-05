'use strict';
/* global describe, it */

const assert = require('assert');

describe('Auth', () => {
  it('should exist', () => {
    assert(global.app.api.policies.AuthPolicy);
  });
});
