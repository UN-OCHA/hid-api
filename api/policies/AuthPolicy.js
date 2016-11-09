'use strict'

const Policy = require('trails-policy')
const Boom = require('boom');

/**
 * @module AuthPolicy
 * @description Is the request authenticated
 */
module.exports = class AuthPolicy extends Policy {

  isAuthenticated(request, reply) {
    const OauthAccessToken = this.app.orm['OauthAccessToken']
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
    } else if (request.params.access_token) {
      token = request.params.access_token;
      delete request.query.access_token;
    } else {
      return reply(Boom.unauthorized('No Authorization header was found'));
    }

    var that = this;

    this.app.services.JwtService.verify(token, function (err, jtoken) {
      if (err) {
        // Verify it's not an oauth access token
        console.log('OAuth Access Token' + token)
        OauthAccessToken
          .findOne({token: token})
          .populate('user client')
          .exec(function (err, tok) {
            console.log(tok)
            if (err || !tok) return reply(Boom.unauthorized('Invalid Token!'));
            request.params.currentUser = tok.user
            reply()
          });
      }
      else {
        console.log('JWT Token')
        request.params.token = jtoken; // This is the decrypted token or the payload you provided
        that.app.orm['user'].findOne({_id: jtoken.id}, function (err, user) {
          if (!err && user) {
            request.params.currentUser = user;
            reply();
          }
          else {
            reply(Boom.unauthorized('Invalid Token!'));
          }
        });
      }
    });
  }


}

