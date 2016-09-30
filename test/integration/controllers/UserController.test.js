'use strict'
/* global describe, it */

const assert = require('assert')

describe('UserController', () => {
  it('should exist', () => {
    assert(global.app.api.controllers['UserController'])
  })
})
