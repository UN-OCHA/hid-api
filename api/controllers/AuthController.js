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
      var app = this.app;
      var query = this.app.orm.User.where({ email: email });
      query
        .populate("favoriteLists")
        .findOne(function (err, user) {
          if (!user) {
            return reply(Boom.unauthorized('invalid email or password'));
          }

          if (!user.validPassword(password)) {
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


}

