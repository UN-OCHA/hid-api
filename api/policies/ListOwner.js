'use strict'

const Policy = require('trails-policy')

/**
 * @module ListOwnerPolicy
 * @description Set List Owner
 */
module.exports = class ListOwnerPolicy extends Policy {

  set(request, reply) {
    if (request.params.model && request.params.model == 'list' && request.method == 'post') {
      request.payload.owner = request.params.token.id
      return reply()
    }
    else {
      return reply()
    }
  }

}

