'use strict';

const Controller = require('trails/controller');

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

  migrateHidLogins (request, reply) {
    reply();
    const User = this.app.orm.User;
    User
      .update({}, { $set: {authOnly: true}}, { multi: true}, function (err, raw) {
      User
        .update({'appMetadata.hid.login': true}, { $set: { authOnly: false }}, {multi: true}, function (err, raw) {

        });
      });
  }
};
