'use strict';
/* global describe, it */

const assert = require('assert');

describe('UserPolicy', () => {
  it('should exist', () => {
    assert(global.app.api.policies['UserPolicy']);
  });
});
