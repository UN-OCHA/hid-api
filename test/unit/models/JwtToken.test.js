'use strict'
/* global describe, it */

const assert = require('assert')

describe('JwtToken Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['JwtToken'])
  })
})
