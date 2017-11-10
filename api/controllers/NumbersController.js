'use strict';

const Controller = require('trails/controller');

/**
 * @module NumbersController
 * @description Generated Trails.js Controller.
 */
module.exports = class NumbersController extends Controller{

  numbers (request, reply) {
    const List = this.app.orm.List;
    const that = this;
    let numberCcls = 0;
    List
      .count({type: 'list'})
      .then(number => {
        numberCcls = number;
        return reply({ 'numberCcls': numberCcls });
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

};
