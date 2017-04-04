'use strict';
/* global describe, it */

const assert = require('assert');

describe('Client Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['Client']);
  });
});
