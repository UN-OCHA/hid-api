'use strict';

const Boom = require('boom');
const acceptLanguage = require('accept-language');
const Hawk = require('hawk');
const JwtToken = require('../../api/models/JwtToken');
const OauthToken = require('../../api/models/OauthToken');
const User = require('../../api/models/User');
const JwtService = require('../../api/services/JwtService');
const config = require('../../config/env')[process.env.NODE_ENV];
const logger = config.logger;

const internals = {};

module.exports = {
  name: 'hapi-auth-hid',
  version: '1.0.0',
  requirements: {
    hapi: '>=17.7.0'
  },
  register: (server, options) => {
    server.auth.scheme('hapi-auth-hid', internals.implementation);
  }
};

internals.implementation = (server, options) => {
  return {
    authenticate: async function (request, h) {
      acceptLanguage.languages(['en', 'fr', 'es']);
      // If we are creating a user and we are not authenticated, allow it
      /*if (request.path === '/api/v2/user' &&
        request.method === 'post' &&
        !request.headers.authorization &&
        !request.params.token) {
        return reply();
      }*/

      let token = '';

      if (request.headers && request.headers.authorization) {
        const parts = request.headers.authorization.split(' ');
        if (parts.length === 2) {
          const scheme = parts[0],
            credentials = parts[1];

          if (/^Bearer$/i.test(scheme) || /^OAuth$/i.test(scheme)) {
            token = credentials;
          }
        }
        else {
          logger.warn('Wrong format for authorization header', {security: true, fail: true, request: request});
          throw Boom.unauthorized('Format is Authorization: Bearer [token]');
        }
      }
      else if (request.query.bewit) {
        const req = {
          method: request.raw.req.method,
          url: request.raw.req.url,
          host: request.raw.req.headers.host,
          port: request.raw.req.protocol === 'http:' ? 80 : 443,
          authorization: request.raw.req.authorization
        };
        const credentialsFunc = function (id) {
          const credentials = {
            key: process.env.COOKIE_PASSWORD,
            algorithm: 'sha256'
          };
          return credentials;
        };
        const {creds, attributes} = await Hawk.uri.authenticate(req, credentialsFunc);
        const user = await User.findOne({_id: attributes.id});
        if (!user) {
          throw Boom.unauthorized('No user found');
        }
        request.params.currentUser = user;
        delete request.query.bewit;
        logger.warn('Successful authentication through bewit', { security: true, request: request});
        return reply.authenticated({
          credentials: user
        });
      }
      else {
        logger.warn('No authorization token was found', { security: true, fail: true, request: request});
        throw Boom.unauthorized('No Authorization header was found');
      }

      if (token !== '') {
        try {
          const jtoken = JwtService.verify(token);
          // Make sure token is not blacklisted
          const tok = await JwtToken.findOne({token: token, blacklist: true});
          if (tok) {
            logger.warn('Tried to get authorization with a blacklisted token', { security: true, fail: true, request: request});
            throw Boom.unauthorized('Invalid Token !');
          }
          request.params.token = jtoken; // This is the decrypted token or the payload you provided
          const user = await User.findOne({_id: jtoken.id});
          if (user) {
            logger.warn('Successful authentication through JWT', { security: true, request: request});
            return reply.authenticated({
              credentials: user
            });
          }
          else {
            logger.warn('Could not find user linked to JWT', { security: true, fail: true, request: request });
            throw Boom.unauthorized('Invalid Token !');
          }
        }
        catch (err) {
          const tok = await OauthToken.findOne({token: token}).populate('user client');
          if (!tok) {
            logger.warn('Invalid token', { security: true, fail: true, request: request});
            throw Boom.unauthorized('Invalid Token!');
          }
          if (tok.isExpired()) {
            logger.warn('Token is expired', { security: true, fail: true, request: request});
            throw Boom.unauthorized('Expired token');
          }
          return reply.authenticated({
            credentials: tok.user,
            artifacts: tok.client
          });
        }
    }
  }
}
