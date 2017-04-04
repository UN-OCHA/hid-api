'use strict';
/* global describe, it */

const assert = require('assert');

describe('NotificationController', () => {
  it('should exist', () => {
    assert(global.app.api.controllers['NotificationController']);
  });
});
