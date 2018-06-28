'use strict';
/* global describe, it */

const assert = require('assert');

describe('Operations', () => {
  it('should exist', () => {
    assert(global.app.api.policies.OperationsPolicy);
  });
});
