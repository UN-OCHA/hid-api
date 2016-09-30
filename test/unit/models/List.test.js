'use strict'
/* global describe, it */

const assert = require('assert')

describe('List Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['List'])
  })
})
