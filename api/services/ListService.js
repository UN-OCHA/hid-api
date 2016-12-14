'use strict';

const Service = require('trails-service');

/**
 * @module ListService
 * @description List Service
 */
module.exports = class ListService extends Service {

  findById(id) {
    return this.orm.List.findOne({'_id': id}).exec();
  }

  getListTypes() {
    return ['list', 'organization', 'operation', 'bundle', 'disaster'];
  }
};
