'use strict';
/* global describe, it */

const assert = require('assert');

describe('Duplicate Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['Duplicate']);
  });
});
