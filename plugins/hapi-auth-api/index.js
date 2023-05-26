/**
 * @module hapi-auth-api
 * @description Bearer token auth strategy for HID API.
 */
const Boom = require('@hapi/boom');
const acceptLanguage = require('accept-language');
const JwtService = require('../../api/services/JwtService');
const JwtToken = require('../../api/models/JwtToken');
const OauthToken = require('../../api/models/OauthToken');
const User = require('../../api/models/User');
const { logger } = require('../../config/env');

const internals = {};

internals.tokenToUser = async (token) => {
  try {
    const jtoken = JwtService.verify(token);
    // Make sure token is not blacklisted
    const tok = await JwtToken.findOne({ token, blacklist: true });
    if (tok) {
      logger.warn(
        'Tried to get authorization with a blacklisted token',
        {
          security: true,
          fail: true,
        },
      );
      throw Boom.unauthorized('Invalid Token !');
    }
    const user = await User.findOne({ _id: jtoken.id });
    if (user) {
      logger.info(
        'Successful authentication through JWT',
        {
          security: true,
          user: {
            id: jtoken.id,
            email: user.email,
            admin: user.is_admin,
          },
        },
      );
      return {
        credentials: user,
      };
    }

    logger.warn(
      'Could not find user linked to JWT',
      {
        security: true,
        fail: true,
      },
    );
    throw Boom.unauthorized('Invalid Token !');
  } catch (err) {
    const tok = await OauthToken.findOne({ token }).populate('user client');
    if (!tok) {
      logger.warn(
        'Invalid token',
        {
          security: true,
          fail: true,
        },
      );
      throw Boom.unauthorized('Invalid Token!');
    }

    if (tok.isExpired()) {
      logger.warn(
        'Token is expired',
        {
          security: true,
          fail: true,
        },
      );
      throw Boom.unauthorized('Expired token');
    }

    logger.info(
      'Successful authentication through OAuth token',
      {
        security: true,
        user: {
          admin: tok.user.is_admin,
          id: tok.user.id,
          email: tok.user.email,
        },
        oauth: {
          client_id: tok.client.id,
        },
      },
    );
    return {
      credentials: tok.user,
      artifacts: tok.client,
    };
  }
};

internals.implementation = () => ({
  async authenticate(request, reply) {
    acceptLanguage.languages(['en', 'fr', 'es']);

    // This array of paths is allowed to execute without having a token set as
    // an Authorization header.
    const allowPathsWithoutAuthentication = [
      '/api/v3/user',
      '/api/v3/jsonwebtoken',
      '/api/v3/admintoken',
    ];

    // Check for our special cases that are allowed to execute without an Auth
    // token being sent.
    if (
      allowPathsWithoutAuthentication.includes(request.path)
      && request.method === 'post'
      && !request.headers.authorization
    ) {
      return reply.continue;
    }

    let token = '';

    if (request.headers && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2) {
        const scheme = parts[0];
        const credentials = parts[1];

        if (/^Bearer$/i.test(scheme) || /^OAuth$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        logger.warn(
          'Wrong format for authorization header',
          {
            request,
            security: true,
            fail: true,
          },
        );
        throw Boom.unauthorized('Format is Authorization: Bearer [token]');
      }
    } else {
      // Pass it on to payload method.
      return reply.authenticated({ credentials: {} });
    }

    if (token !== '') {
      const creds = await internals.tokenToUser(token);
      return reply.authenticated(creds);
    }
    logger.warn(
      'No authorization token was found',
      {
        request,
        security: true,
        fail: true,
      },
    );
    throw Boom.unauthorized('No Authorization header was found');
  },

  async payload(request, h) {
    let isAuthenticated = true;
    if (Object.keys(request.auth.credentials).length === 0) {
      isAuthenticated = false;
    }
    if (isAuthenticated) {
      return h.continue;
    }
    if (request.payload && request.payload.access_token) {
      const creds = await internals.tokenToUser(request.payload.access_token);
      request.auth.credentials = creds.credentials;
      return h.continue;
    }
    logger.warn(
      'No authorization token was found',
      {
        request,
        security: true,
        fail: true,
      },
    );
    throw Boom.unauthorized('No authorization token found');
  },

  options: {
    payload: true,
  },
});

module.exports = {
  name: 'hapi-auth-api',
  version: '1.0.0',
  requirements: {
    hapi: '>=17.7.0',
  },
  register: (server) => {
    server.auth.scheme('hapi-auth-api', internals.implementation);
  },
};
