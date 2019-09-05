

const jwt = require('jsonwebtoken');
const fs = require('fs');
const rsa2jwk = require('rsa-pem-to-jwk');

/**
 * @module JwtService
 * @description Json Web Tokens Service
 */
module.exports = {

  // Generates a token from supplied payload
  issue(payload) {
    const cert = fs.readFileSync('keys/hid.rsa');
    const options = { algorithm: 'RS256', header: { kid: 'hid-dev' } };
    return jwt.sign(
      payload,
      cert,
      options,
    );
  },

  // Verifies token on a request
  verify(token) {
    const cert = fs.readFileSync('keys/hid.rsa.pub');
    return jwt.verify(token, cert);
  },

  public2jwk() {
    const cert = fs.readFileSync('keys/hid.rsa.pub');
    return rsa2jwk(cert, { use: 'sig', kid: 'hid-dev' }, 'public');
  },

  generateIdToken(client, user, scope, nonce) {
    const now = Math.floor(Date.now() / 1000);
    let sub = user._id;
    if (client.id === 'iasc-prod' || client.id === 'iasc-dev') {
      sub = user.email;
    }
    const idToken = {
      iss: process.env.ROOT_URL,
      sub,
      aud: client.id,
      exp: now + 24 * 3600,
      nonce,
      iat: now,
    };
    if (scope.indexOf('email') !== -1) {
      idToken.email = user.email;
      idToken.email_verified = user.email_verified;
    }
    if (scope.indexOf('profile') !== -1) {
      idToken.name = user.name;
      idToken.family_name = user.family_name;
      idToken.given_name = user.given_name;
      idToken.picture = user.picture;
      idToken.updated_at = user.updatedAt;
    }
    return this.issue(idToken);
  },

};
