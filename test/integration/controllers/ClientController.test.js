'use strict'
/* global describe, it */

const assert = require('assert')

describe('ClientController', () => {
  it('should exist', () => {
    assert(global.app.api.controllers['ClientController'])
  })
})
