'use strict'
/* global describe, it */

const assert = require('assert')

describe('Flood Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['Flood'])
  })
})
