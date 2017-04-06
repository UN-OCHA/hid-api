'use strict';

const Controller = require('trails/controller');

/**
 * @module ClientController
 * @description Generated Trails.js Controller.
 */
module.exports = class ClientController extends Controller{

  create (request, reply) {
    request.params.model = 'client';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.create(request, reply);
  }

  find (request, reply) {
    const Client = this.app.orm.Duplicate;
    const options = this.app.services.HelperService.getOptionsFromQuery(request.query);
    const criteria = this.app.services.HelperService.getCriteriaFromQuery(request.query);

    const that = this;
    const query = this.app.services.HelperService.find('Client', criteria, options);
    query
      .then((results) => {
        return Client
          .count(criteria)
          .then((number) => {
            return {result: results, number: number};
          });
      })
      .then((result) => {
        return reply(result.result).header('X-Total-Count', result.number);
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  update (request, reply) {
    request.params.model = 'client';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.update(request, reply);
  }

  destroy (request, reply) {
    request.params.model = 'client';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
