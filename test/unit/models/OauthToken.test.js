'use strict';
/* global describe, it */

const assert = require('assert');

describe('OauthToken Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['OauthToken']);
  });
});
