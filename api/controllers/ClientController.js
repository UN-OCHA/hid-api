'use strict'

const Controller = require('trails-controller')

/**
 * @module ClientController
 * @description Generated Trails.js Controller.
 */
module.exports = class ClientController extends Controller{

  create (request, reply) {
    request.params.model = 'client'
    const FootprintController = this.app.controllers.FootprintController
    FootprintController.create(request, reply)
  }

  find (request, reply) {
    request.params.model = 'client'
    const FootprintController = this.app.controllers.FootprintController
    FootprintController.find(request, reply)
  }

  update (request, reply) {
    request.params.model = 'client'
    const FootprintController = this.app.controllers.FootprintController
    FootprintController.update(request, reply)
  }

  destroy (request, reply) {
    request.params.model = 'client'
    const FootprintController = this.app.controllers.FootprintController
    FootprintController.destroy(request, reply)
  }
}

