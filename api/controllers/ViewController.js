'use strict'

const Controller = require('trails-controller')

module.exports = class ViewController extends Controller {

  login (request, reply) {
    const session = request.yar.get('session')
    if (session) { // User is already logged in
      if (request.query.client_id && request.query.redirect_uri && request.query.response_type && request.query.scope) {
        // Redirect to /oauth/authorize
        var redirect = request.query.redirect || '/oauth/authorize';
        redirect += "?client_id=" + request.query.client_id;
        redirect += "&redirect_uri=" + request.query.redirect_uri;
        redirect += "&response_type=" + request.query.response_type;
        redirect += "&scope=" + request.query.scope;

        return reply.redirect(redirect);
      }
    }

    return reply.view('login', {
      title: 'Log into Humanitarian ID',
      query: request.query,
      alert: false
    })
  }

  logout (request, reply) {
    request.yar.reset()
    return reply.redirect('/')
  }

  register (request, reply) {
    const requestUrl = request.connection.info.protocol + '://' + request.info.host + '/verify?client_id=' + request.query.client_id + '&redirect_uri=' + request.query.redirect_uri + '&response_type=' + request.query.response_type + '&scope=' + request.query.scope
    reply.view('register', {
      title: 'Register in Humanitarian ID',
      requestUrl: requestUrl
    })
  }

  registerPost (request, reply) {
    const UserController = this.app.controllers.UserController
    UserController.create(request, function (result) {
      var al = {}
      if (!result.isBoom) {
        al = {
          type: 'success',
          message: 'You registered successfully. Please confirm your email address'
        }
      }
      else {
        al = {
          type: 'danger',
          message: 'There was an error registering you.'
        }
      }
      return reply.view('login', {
        alert: al,
        query: request.query
      })
    });
  }

  verify (request, reply) {
    const UserController = this.app.controllers.UserController
    if (!request.query.hash) return reply(Boom.badRequest('Missing hash parameter'))
    request.payload = { hash: request.query.hash }
    UserController.validateEmail(request, function (result) {
      var al = {}
      if (!result.isBoom) {
        al = {
          type: 'success',
          message: 'Thank you for confirming your email address. You can now log in'
        }
      }
      else {
        al = {
          type: 'danger',
          message: 'There was an error confirming your email address.'
        }
      }
      return reply.view('login', {
        alert: al,
        query: request.query
      })
    }) 
  }
}
