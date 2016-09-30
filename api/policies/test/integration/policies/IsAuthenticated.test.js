'use strict'
/* global describe, it */

const assert = require('assert')

describe('IsAuthenticated', () => {
  it('should exist', () => {
    assert(global.app.api.policies['IsAuthenticated'])
  })
})
