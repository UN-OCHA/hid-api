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
      query: request.query
    })
  }
}
