'use strict';

const Policy = require('trails/policy');
const Boom = require('boom');
const acceptLanguage = require('accept-language');
const speakeasy = require('speakeasy');

/**
 * @module AuthPolicy
 * @description Is the request authenticated
 */
module.exports = class AuthPolicy extends Policy {

  isAuthenticated (request, reply) {
    acceptLanguage.languages(['en', 'fr', 'es']);
    const OauthToken = this.app.orm.OauthToken;
    const JwtToken = this.app.orm.JwtToken;
    const User = this.app.orm.User;
    // If we are creating a user and we are not authenticated, allow it
    if (request.path === '/api/v2/user' &&
      request.method === 'post' &&
      !request.headers.authorization &&
      !request.params.token) {
      return reply();
    }

    let token;

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
        this.log.warn('Wrong format for authorization header', {security: true, fail: true, request: request});
        return reply(Boom.unauthorized('Format is Authorization: Bearer [token]'));
      }
    }
    else if (request.query.token) {
      token = request.query.token;
      // We delete the token from param to not mess with blueprints
      delete request.query.token;
    }
    else if (request.query.access_token) {
      token = request.query.access_token;
      delete request.query.access_token;
    }
    else if (request.payload && request.payload.access_token) {
      token = request.payload.access_token;
      delete request.payload.access_token;
    }
    else {
      this.log.warn('No authorization token was found', { security: true, fail: true, request: request});
      return reply(Boom.unauthorized('No Authorization header was found'));
    }

    const that = this;

    this.app.services.JwtService.verify(token, function (err, jtoken) {
      if (err) {
        // Verify it's not an oauth access token
        OauthToken
          .findOne({token: token})
          .populate('user client')
          .exec(function (err, tok) {
            // TODO: make sure the token is not expired
            if (err || !tok) {
              that.log.warn('Invalid token', { security: true, fail: true, request: request});
              return reply(Boom.unauthorized('Invalid Token!'));
            }
            request.params.currentUser = tok.user;
            request.params.currentClient = tok.client;
            reply();
          });
      }
      else {
        // Make sure token is not blacklisted
        JwtToken
          .findOne({token: token, blacklist: true})
          .then(tok => {
            if (tok) {
              that.log.warn('Tried to get authorization with a blacklisted token', { security: true, fail: true, request: request});
              return reply(Boom.unauthorized('Invalid Token !'));
            }
            request.params.token = jtoken; // This is the decrypted token or the payload you provided
            User
              .findOne({_id: jtoken.id})
              .then(user => {
                if (user) {
                  request.params.currentUser = user;
                  that.log.warn('Successful authentication through JWT', { security: true, request: request});
                  reply();
                }
                else {
                  that.log.warn('Could not find user linked to JWT', { security: true, fail: true, request: request });
                  reply(Boom.unauthorized('Invalid Token !'));
                }
              });
          })
          .catch(err => {
            that.app.services.ErrorService.handle(err, request, reply);
          });
      }
    });
  }

  isTOTPAuthenticated (request, reply) {
    const user = request.params.currentUser;
    const token = request.headers['X-HID-TOTP'];

    if (!user.totpConf || !user.totpConf.secret) {
      return reply(Boom.unauthorized('TOTP was not configured for this user'));
    }

    if (!token) {
      return reply(Boom.unauthorized('No TOTP token'));
    }

    const success = speakeasy.totp.verify({
      secret: user.totpConf.secret,
      encoding: 'base32',
      window: 1, // let user enter previous totp token because ux
      token
    });

    if (success) {
      return reply();
    }
    else {
      return reply(Boom.unauthorized('Invalid TOTP token !'));
    }
  }

  isAdmin (request, reply) {
    if (!request.params.currentUser.is_admin) {
      this.log.warn('User is not an admin', { security: true, fail: true, request: request});
      return reply(Boom.forbidden('You need to be an admin'));
    }
    reply();
  }

};
