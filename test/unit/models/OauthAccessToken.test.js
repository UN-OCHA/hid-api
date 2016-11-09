'use strict'
/* global describe, it */

const assert = require('assert')

describe('OauthAccessToken Model', () => {
  it('should exist', () => {
    assert(global.app.api.models['OauthAccessToken'])
  })
})
