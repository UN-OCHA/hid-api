'use strict';
/* global describe, it */

const assert = require('assert');

describe('OutlookSync Model', () => {
  it('should exist', () => {
    assert(global.app.api.models.OutlookSync);
  });
});
