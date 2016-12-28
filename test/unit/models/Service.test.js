'use strict'
/* global describe, it */

const assert = require('assert')

describe('Service Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['Service'])
  })
})
