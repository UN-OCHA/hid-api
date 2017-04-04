'use strict';

const Controller = require('trails/controller');

/**
 * @module ServiceCredentialsController
 * @description Generated Trails.js Controller.
 */
module.exports = class ServiceCredentialsController extends Controller{

  find (request, reply) {
    request.params.model = 'servicecredentials';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.find(request, reply);
  }

};
