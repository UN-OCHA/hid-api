'use strict'
/* global describe, it */

const assert = require('assert')

describe('ServiceController', () => {
  it('should exist', () => {
    assert(global.app.api.controllers['ServiceController'])
  })
})
