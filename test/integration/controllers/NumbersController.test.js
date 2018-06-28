'use strict';
/* global describe, it */

const assert = require('assert');

describe('NumbersController', () => {
  it('should exist', () => {
    assert(global.app.api.controllers.NumbersController);
  });
});
