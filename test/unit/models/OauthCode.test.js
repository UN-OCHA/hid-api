'use strict'
/* global describe, it */

const assert = require('assert')

describe('OauthCode Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['OauthCode'])
  })
})
