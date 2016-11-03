'use strict'

const Controller = require('trails-controller')
const Boom = require('boom')

/**
 * @module AuthController
 * @description Generated Trails.js Controller.
 */
module.exports = class AuthController extends Controller{

  /**
   * Authenticate user through JWT
   */
  authenticate (request, reply) {
    var email = request.payload.email
    var password = request.payload.password

    if (!email || !password) {
      reply(Boom.unauthorized('email and password required'));
    }
    else {
      var that = this;
      var app = this.app;
      var query = this.app.orm.User.where({ email: email });
      query
        .populate("favoriteLists operations.list organizations.list organization.list bundles.list lists.list")
        .findOne(function (err, user) {
          if (!user) {
            that.log.info('Could not find user');
            return reply(Boom.unauthorized('invalid email or password'));
          }

          if (!user.email_verified) {
            that.log.info('User has not verified his email');
            return reply(Boom.unauthorized('Please verify your email address'));
          }

          if (!user.validPassword(password)) {
            that.log.info("Wrong password");
            return reply(Boom.unauthorized('invalid email or password'));
          }
          else {
            return reply({
              user: user,
              token: app.services.JwtService.issue({id: user._id })
            });
          }
        })
    }
  }

  authorizeOauth2 (request, reply) {
    
  }

  authenticateOauth2 (request, reply) {
    var oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize'];
    
  }


}

