'use strict';
/* global describe, it */

const assert = require('assert');

describe('HelperService', () => {
  it('should exist', () => {
    assert(global.app.api.services['HelperService']);
  });
});
