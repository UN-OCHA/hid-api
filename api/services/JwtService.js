'use strict'

const Service = require('trails-service')
const jwt = require('jsonwebtoken')
const fs = require('fs')

/**
 * @module JwtService
 * @description Json Web Tokens Service
 */
module.exports = class JwtService extends Service {

  // Generates a token from supplied payload
  issue (payload) {
    var cert = fs.readFileSync('keys/hid.rsa');
    var options = { algorithm: "RS256" }
    if (!payload.exp) {
       options.expiresIn = "3h"
     }
    return jwt.sign(
      payload,
      cert,
      options
    );
  }

  // Verifies token on a request
  verify (token, callback) {
    var cert = fs.readFileSync('keys/hid.rsa.pub');
    return jwt.verify(
      token, // The token to be verified
      cert, // Same token we used to sign
      {}, // No Option, for more see https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
      callback //Pass errors or decoded token to callback
    );
  }
}

