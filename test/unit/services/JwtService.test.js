'use strict'
/* global describe, it */

const assert = require('assert')

describe('JwtService', () => {
  it('should exist', () => {
    assert(global.app.api.services['JwtService'])
  })
})
