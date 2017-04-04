'use strict';

const Service = require('trails/service');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const rsa2jwk = require('rsa-pem-to-jwk');

/**
 * @module JwtService
 * @description Json Web Tokens Service
 */
module.exports = class JwtService extends Service {

  // Generates a token from supplied payload
  issue (payload) {
    const cert = fs.readFileSync('keys/hid.rsa');
    const options = { algorithm: 'RS256', header: { kid: 'hid-dev'} };
    return jwt.sign(
      payload,
      cert,
      options
    );
  }

  // Verifies token on a request
  verify (token, callback) {
    const cert = fs.readFileSync('keys/hid.rsa.pub');
    return jwt.verify(
      token, // The token to be verified
      cert, // Same token we used to sign
      {}, // No Option, for more see https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
      callback //Pass errors or decoded token to callback
    );
  }

  public2jwk () {
    const cert = fs.readFileSync('keys/hid.rsa.pub');
    return rsa2jwk(cert, { use: 'sig', kid: 'hid-dev'}, 'public');
  }

  generateIdToken (client, user) {
    const now = Math.floor(Date.now() / 1000);
    const idToken = {
      iss: process.env.ROOT_URL,
      sub: user._id,
      aud: client.id,
      exp: now + 3600,
      iat: now
    };
    return this.issue(idToken);
  }

};
