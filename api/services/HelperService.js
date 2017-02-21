'use strict';

const Service = require('trails/service');
const _ = require('lodash');
const queryOptions = [
  'populate',
  'limit',
  'offset',
  'sort',
  'fields'
];

/**
 * @module HelperService
 * @description General Helper Service
 */
module.exports = class HelperService extends Service {
  getOptionsFromQuery(query) {
    return _.pick(query, queryOptions);
  }

  getCriteriaFromQuery(query) {
    return _.omit(query, queryOptions);
  }
};
