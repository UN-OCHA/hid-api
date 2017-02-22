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
    let criteria = _.omit(query, queryOptions);
    for (let i = 0, len = criteria.length; i < len; i++) {
      if (criteria[i] === 'true') {
        criteria[i] = true;
      }
      if (criteria[i] === false) {
        criteria[i] = false;
      }
    }
    return criteria;
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
