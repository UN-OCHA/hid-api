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
    const cert = fs.readFileSync('keys/hid.rsa');
    const options = { algorithm: 'RS256', header: { kid: 'hid-dev' } };
    const loggedUser = {};

    if (payload.id) {
      loggedUser.id = payload.id;
    }
    if (payload.sub) {
      loggedUser.id = payload.sub;
    }

    logger.info(
      '[JwtService->issue] issuing JWT',
      {
        security: true,
        user: loggedUser,
        oauth: {
          client_id: payload.client || '',
        },
      },
    );

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
    const sub = user.id;
    const loggedScopes = [];

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
      loggedScopes.push('email');
      idToken.email = user.email;
      idToken.email_verified = user.email_verified;
    }

    if (scope.indexOf('profile') !== -1) {
      loggedScopes.push('profile');
      idToken.name = user.name;
      idToken.family_name = user.family_name;
      idToken.given_name = user.given_name;
      idToken.updated_at = user.updatedAt;
    }

    logger.info(
      '[JwtService->generateIdToken] Generating ID token',
      {
        security: true,
        oauth: {
          client_id: client.id,
          scopes: loggedScopes.join(','),
        },
        user: {
          id: user.id,
          email: user.email,
          admin: user.is_admin,
        },
      },
    );

    return this.issue(idToken);
  },

};
