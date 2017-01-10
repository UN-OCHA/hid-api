'use strict';
/* global describe, it */

const assert = require('assert');

describe('ListUserPolicy', () => {
  it('should exist', () => {
    assert(global.app.api.policies['ListUserPolicy']);
  });
});
