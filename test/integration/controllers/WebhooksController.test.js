'use strict';
/* global describe, it */

const assert = require('assert');

describe('WebhooksController', () => {
  it('should exist', () => {
    assert(global.app.api.controllers.WebhooksController);
  });
});
