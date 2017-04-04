'use strict';
/* global describe, it */

const assert = require('assert');

describe('ErrorService', () => {
  it('should exist', () => {
    assert(global.app.api.services['ErrorService']);
  });
});
