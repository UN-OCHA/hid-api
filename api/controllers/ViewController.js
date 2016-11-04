'use strict'

const Controller = require('trails-controller')

module.exports = class ViewController extends Controller {

  login (request, reply) {
    reply.view('login', {
      title: 'Log into Humanitarian ID',
      query: request.query
    })
  }
}
