'use strict';
/* global describe, it */

const assert = require('assert');

describe('ServicePolicy', () => {
  it('should exist', () => {
    assert(global.app.api.policies['ServicePolicy']);
  });
});
