'use strict'
/* global describe, it */

const assert = require('assert')

describe('Notification Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['Notification'])
  })
})
