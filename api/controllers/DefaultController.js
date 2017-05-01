'use strict';

const Controller = require('trails/controller');
const listAttrs = ['operations', 'bundles', 'disasters', 'lists', 'organizations', 'organization', 'functional_roles', 'offices'];

/**
 * @module DefaultController
 *
 * @description Default Controller included with a new Trails app
 * @see {@link http://trailsjs.io/doc/api/controllers}
 * @this TrailsApp
 */
module.exports = class DefaultController extends Controller {

  importLists (request, reply) {
    reply();
    this.app.config.cron.importLists(this.app);
  }
};
