'use strict';
/* global describe, it */

const assert = require('assert');

describe('Operation Model', () => {
  it('should exist', () => {
    assert(global.app.api.models.Operation);
  });
});
