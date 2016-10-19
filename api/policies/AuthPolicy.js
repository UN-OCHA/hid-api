'use strict'

const Policy = require('trails-policy')
const Boom = require('boom');

/**
 * @module AuthPolicy
 * @description Is the request authenticated
 */
module.exports = class AuthPolicy extends Policy {

  isAuthenticated(request, reply) {
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

        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        return reply(Boom.unauthorized('Format is Authorization: Bearer [token]'));
      }
    } else if (request.params.token) {
      token = request.params.token;
      // We delete the token from param to not mess with blueprints
      delete request.query.token;
    } else {
      return reply(Boom.unauthorized('No Authorization header was found'));
    }

    var that = this;

    this.app.services.JwtService.verify(token, function (err, token) {
      if (err) return reply(Boom.unauthorized('Invalid Token!'));
      request.params.token = token; // This is the decrypted token or the payload you provided
      that.app.orm['user'].findOne({_id: token.id}, function (err, user) {
        if (!err && user) {
          request.params.currentUser = user;
          reply();
        }
        else {
          reply(Boom.unauthorized('Invalid Token!'));
        }
      });
    });
  }


}

