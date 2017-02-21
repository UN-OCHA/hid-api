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

  find (modelName, criteria, options) {
    const Model = this.app.orm[modelName];
    let query = Model.find(criteria);
    if (options.limit) {
      query.limit(parseInt(options.limit));
    }
    if (options.offset) {
      query.skip(parseInt(options.offset));
    }
    if (options.sort) {
      query.sort(options.sort);
    }
    if (options.populate) {
      query.populate(options.populate);
    }
    if (options.fields) {
      query.select(options.fields);
    }
    return query;
  }
};
