'use strict';

const Policy = require('trails-policy');
const Boom = require('boom');
const Schema = require('mongoose').Schema;

/**
 * @module AuthPolicy
 * @description Is the request authenticated
 */
module.exports = class AuthPolicy extends Policy {

  isAuthenticated (request, reply) {
    const OauthToken = this.app.orm.OauthToken;
    // If we are creating a user and we are not authenticated, allow it
    if (request.path == '/api/v2/user' && request.method == 'post' && !request.headers.authorization && !request.params.token) {
      return reply();
    }

    var token;

    if (request.headers && request.headers.authorization) {
      var parts = request.headers.authorization.split(' ');
      if (parts.length == 2) {
        var scheme = parts[0],
          credentials = parts[1];

        if (/^Bearer$/i.test(scheme) || /^OAuth$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        return reply(Boom.unauthorized('Format is Authorization: Bearer [token]'));
      }
    } else if (request.query.token) {
      token = request.query.token;
      // We delete the token from param to not mess with blueprints
      delete request.query.token;
    } else if (request.query.access_token) {
      token = request.query.access_token;
      delete request.query.access_token;
    } else if (request.payload && request.payload.access_token) {
      token = request.payload.access_token
      delete request.payload.access_token
    } else {
      return reply(Boom.unauthorized('No Authorization header was found'));
    }

    var that = this;

    this.app.services.JwtService.verify(token, function (err, jtoken) {
      if (err) {
        // Verify it's not an oauth access token
        OauthToken
          .findOne({token: token, type: 'access'})
          .populate('user client')
          .exec(function (err, tok) {
            // TODO: make sure the token is not expired
            if (err || !tok) {
              return reply(Boom.unauthorized('Invalid Token!'));
            }
            request.params.currentUser = tok.user;
            reply();
          });
      }
      else {
        request.params.token = jtoken; // This is the decrypted token or the payload you provided
        that.app.orm.User.findOne({_id: Schema.ObjectId(jtoken.id)}, function (err, user) {
          if (!err && user) {
            request.params.currentUser = user;
            reply();
          }
          else {
            that.log.error(err);
            reply(Boom.unauthorized('Invalid Token!'));
          }
        });
      }
    });
  }

  isAdmin (request, reply) {
    this.isAuthenticated(request, function (err) {
      if (err && err.isBoom) {
        return reply(err);
      }
      if (!request.params.currentUser) {
        return reply(Boom.unauthorized('Current user was not set'));
      }
      if (!request.params.currentUser.is_admin) {
        return reply(Boom.forbidden('You need to be an admin'));
      }
      reply()
    });
  }

  isAdminOrCurrent (request, reply) {
    this.isAuthenticated(request, function (err) {
      if (err && err.isBoom) {
        return reply(err);
      }
      if (!request.params.currentUser) {
        return reply(Boom.unauthorized('Current user was not set'));
      }
      if (!request.params.currentUser.is_admin && request.params.currentUser.id != request.params.id) {
        return reply(Boom.unauthorized('You need to be an admin or the current user'));
      }
      reply();
    });
  }


};
