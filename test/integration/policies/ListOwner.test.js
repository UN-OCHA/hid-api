'use strict'
/* global describe, it */

const assert = require('assert')

describe('ListOwner', () => {
  it('should exist', () => {
    assert(global.app.api.policies['ListOwner'])
  })
})
