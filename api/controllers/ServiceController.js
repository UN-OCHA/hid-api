'use strict';

const Controller = require('trails-controller');

/**
 * @module ServiceController
 * @description Generated Trails.js Controller.
 */
module.exports = class ServiceController extends Controller{

  create (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.create(request, reply);
  }

  find (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.find(request, reply);
  }

  update (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.update(request, reply);
  }

  destroy (request, reply) {
    request.params.model = 'service';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
