'use strict';
/* global describe, it */

const assert = require('assert');

describe('List', () => {
  it('should exist', () => {
    assert(global.app.api.policies['ListPolicy']);
  });
});
