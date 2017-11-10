'use strict';

const Controller = require('trails/controller');

/**
 * @module NumbersController
 * @description Generated Trails.js Controller.
 */
module.exports = class NumbersController extends Controller{

  numbers (request, reply) {
    const List = this.app.orm.List, User = this.app.orm.User;
    const that = this;
    let numberCcls = 0, numberAuth = 0, numberUsers = 0;
    List
      .count({type: 'list'})
      .then(number1 => {
        numberCcls = number1;
        return User.count({'authOnly': true});
      })
      .then(number2 => {
        numberAuth = number2;
        return User.count({});
      })
      .then(number3 => {
        numberUsers = number3;
        return reply({
          'numberCcls': numberCcls,
          'numberAuth': numberAuth,
          'numberUsers': numberUsers
        });
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

};
