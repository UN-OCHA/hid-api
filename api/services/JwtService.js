/**
 * @module JwtService
 * @description JSON Web Token Service
 */
const jwt = require('jsonwebtoken');
const fs = require('fs');
const rsa2jwk = require('rsa-pem-to-jwk');
const config = require('../../config/env');

const { logger } = config;

module.exports = {

  // Generates a token from supplied payload
  issue(payload) {
    const cert = fs.readFileSync('keys/sign.rsa');
    const options = { algorithm: 'RS256', header: { kid: `hid-v3-${process.env.NODE_ENV}` } };
    return jwt.sign(
      payload,
      cert,
      options,
    );
  },

  // Verifies token on a request
  verify(token) {
    let success = false;

    try {
      // First try with the new signing key. For now, if this fails we'll fall
      // back to the older key.
      //
      // @see https://humanitarian.atlassian.net/browse/HID-2027
      const cert = fs.readFileSync('keys/sign.rsa.pub');
      success = jwt.verify(token, cert);
    } catch (err) {
      logger.warn(
        '[JwtService->verify] New signing key could not verify JWT.',
        {
          security: true,
          fail: true,
        },
      );

      // During transition period, we try again with the old key if the new
      // signing key was either missing, or unable to verify the JWT.
      //
      // @see https://humanitarian.atlassian.net/browse/HID-2027
      const legacyCert = fs.readFileSync('keys/hid.rsa.pub');
      success = jwt.verify(token, legacyCert);
    }

    return success;
  },

  public2jwk() {
    // Hold all keys in this array and return it at the end.
    const jsonWebKeys = [];

    try {
      // Legacy key
      const legacyCert = fs.readFileSync('keys/hid.rsa.pub');
      jsonWebKeys.push(rsa2jwk(legacyCert, {
        use: 'sig',
        kid: 'hid-dev',
        alg: 'RS256',
      }, 'public'));

      // 2021 key
      const cert = fs.readFileSync('keys/sign.rsa.pub');
      jsonWebKeys.push(rsa2jwk(cert, {
        use: 'sig',
        kid: `hid-2021-${process.env.NODE_ENV}`,
        alg: 'RS256',
      }, 'public'));
    } catch (err) {
      logger.error(
        `[JwtService->public2jwk] ${err.message}`,
        {
          security: true,
          fail: true,
        },
      );
    }

    return jsonWebKeys;
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
      auth_time: Math.floor(user.auth_time.getTime() / 1000),
    };
    if (scope.indexOf('email') !== -1) {
      idToken.email = user.email;
      idToken.email_verified = user.email_verified;
    }
    if (scope.indexOf('profile') !== -1) {
      idToken.name = user.name;
      idToken.family_name = user.family_name;
      idToken.given_name = user.given_name;
      idToken.updated_at = user.updatedAt;
    }
    return this.issue(idToken);
  },

};
