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

  testNotify (request, reply) {
    const List = this.app.orm.List;
    const User = this.app.orm.User;
    const NotificationService = this.app.services.NotificationService;

    List
      .findOne({remote_id: 71})
      .then((list) => {
        if (!list) {
          throw new Error('List not found');
        }
        return User
          .find({'operations.list': list._id})
          .then((users) => {
            return {list: list, users: users};
          });
      })
      .then((results) => {
        const list = results.list, users = results.users;
        const notification = {type: 'new_disaster', params: {list: list}};
        NotificationService.sendMultiple(users, notification, () => { });
      })
      .catch((err) => {});
  }

  importLists (request, reply) {
    reply();
    this.app.config.cron.importLists(this.app);
  }
};
