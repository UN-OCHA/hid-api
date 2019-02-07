'use strict';

const Boom = require('boom');
const acceptLanguage = require('accept-language');
const authenticator = require('authenticator');
const Hawk = require('hawk');
const JwtToken = require('../models/JwtToken');
const OauthToken = require('../models/OauthToken');
const User = require('../models/User');
const JwtService = require('../services/JwtService');
const ErrorService = require('../services/ErrorService');

/**
 * @module AuthPolicy
 * @description Is the request authenticated
 */

function isTOTPValid (user, token) {
 return new Promise(function (resolve, reject) {
   if (!user.totpConf || !user.totpConf.secret) {
     return reject(Boom.unauthorized('TOTP was not configured for this user', 'totp'));
   }

   if (!token) {
     return reject(Boom.unauthorized('No TOTP token', 'totp'));
   }

   if (token.length === 6) {
     const success = authenticator.verifyToken(user.totpConf.secret, token);

     if (success) {
       return resolve(user);
     }
     else {
       return reject(Boom.unauthorized('Invalid TOTP token !', 'totp'));
     }
   }
   else {
     // Using backup code
     const index = user.backupCodeIndex(token);
     if (index === -1) {
       return reject(Boom.unauthorized('Invalid backup code !', 'totp'));
     }
     else {
       // remove backup code so it can't be reused
       user.totpConf.backupCodes.slice(index, 1);
       user.markModified('totpConf');
       user
         .save()
         .then(() => {
           return resolve(user);
         })
         .catch(err => {
           return reject(Boom.badImplementation());
         });
     }
   }
 });
}

module.exports = {

  isAuthenticated: function (request, reply) {
    acceptLanguage.languages(['en', 'fr', 'es']);
    // If we are creating a user and we are not authenticated, allow it
    if (request.path === '/api/v2/user' &&
      request.method === 'post' &&
      !request.headers.authorization &&
      !request.params.token) {
      return reply();
    }

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
        return reply(Boom.unauthorized('Format is Authorization: Bearer [token]'));
      }
    }
    else if (request.query.access_token) {
      token = request.query.access_token;
      delete request.query.access_token;
    }
    else if (request.query.bewit) {
      const req = {
        method: request.raw.req.method,
        url: request.raw.req.url,
        host: request.raw.req.headers.host,
        port: request.raw.req.protocol === 'http:' ? 80 : 443,
        authorization: request.raw.req.authorization
      };
      Hawk.uri.authenticate(req, function (id, callback) {
        const credentials = {
          key: process.env.COOKIE_PASSWORD,
          algorithm: 'sha256'
        };
        return callback(null, credentials);
      }, {
        localtimeOffsetMsec: 0
      }, function (err, credentials, artifacts) {
        if (err) {
          return reply(err);
        }
        User
          .findOne({_id: artifacts.id})
          .then(user => {
            if (!user) {
              return reply(Boom.unauthorized('No user found'));
            }
            request.params.currentUser = user;
            delete request.query.bewit;
            logger.warn('Successful authentication through bewit', { security: true, request: request});
            reply();
          });
      });
    }
    else {
      logger.warn('No authorization token was found', { security: true, fail: true, request: request});
      return reply(Boom.unauthorized('No Authorization header was found'));
    }

    if (token !== '') {
      JwtService.verify(token, function (err, jtoken) {
        if (err) {
          // Verify it's not an oauth access token
          OauthToken
            .findOne({token: token})
            .populate('user client')
            .then(tok => {
              // TODO: make sure the token is not expired
              if (!tok) {
                logger.warn('Invalid token', { security: true, fail: true, request: request});
                return reply(Boom.unauthorized('Invalid Token!'));
              }
              if (tok.isExpired()) {
                logger.warn('Token is expired', { security: true, fail: true, request: request});
                return reply(Boom.unauthorized('Expired token'));
              }
              request.params.currentUser = tok.user;
              request.params.currentClient = tok.client;
              reply();
            })
            .catch(err => {
              ErrorService.handle(err, request, reply);
            });
        }
        else {
          // Make sure token is not blacklisted
          JwtToken
            .findOne({token: token, blacklist: true})
            .then(tok => {
              if (tok) {
                logger.warn('Tried to get authorization with a blacklisted token', { security: true, fail: true, request: request});
                return reply(Boom.unauthorized('Invalid Token !'));
              }
              request.params.token = jtoken; // This is the decrypted token or the payload you provided
              return User.findOne({_id: jtoken.id});
            })
            .then(user => {
              if (user) {
                request.params.currentUser = user;
                logger.warn('Successful authentication through JWT', { security: true, request: request});
                reply();
              }
              else {
                logger.warn('Could not find user linked to JWT', { security: true, fail: true, request: request });
                reply(Boom.unauthorized('Invalid Token !'));
              }
            })
            .catch(err => {
              ErrorService.handle(err, request, reply);
            });
        }
      });
    }
  },

  isTOTPEnabledAndValid: function (request, reply) {
    const user = request.params.currentUser;

    if (!user.totp) {
      // User does not have totp enabled, pass
      return reply();
    }
    else {
      isTOTPValid(request.params.currentUser, request.headers['x-hid-totp'])
        .then(() => {
          return reply();
        })
        .catch(err => {
          return reply(err);
        });
    }
  },

  isTOTPValidPolicy: function (request, reply) {
    const user = request.params.currentUser;
    const token = request.headers['x-hid-totp'];
    isTOTPValid(user, token)
      .then(() => {
        return reply();
      })
      .catch(err => {
        return reply(err);
      });
  },

  isAdmin: function (request, reply) {
    if (!request.params.currentUser.is_admin) {
      logger.warn('User is not an admin', { security: true, fail: true, request: request});
      return reply(Boom.forbidden('You need to be an admin'));
    }
    reply();
  },

  isAdminOrGlobalManager: function (request, reply) {
    if (!request.params.currentUser.is_admin && !request.params.currentUser.isManager) {
      logger.warn('User is neither an admin nor a global manager', { security: true, fail: true, request: request});
      return reply(Boom.forbidden('You need to be an admin or a global manager'));
    }
    reply();
  }

};
