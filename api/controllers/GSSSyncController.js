'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');

/**
 * @module GSSSyncController
 * @description Generated Trails.js Controller.
 */
module.exports = class GSSSyncController extends Controller{

  create (request, reply) {
    const GSSSync = this.app.orm.GSSSync;
    const that = this;
    GSSSync
      .create(request.payload)
      .then((gsssync) => {
        if (!gsssync) {
          throw Boom.badRequest();
        }
        return reply(gsssync);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  destroy (request, reply) {
    request.params.model = 'gsssync';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
