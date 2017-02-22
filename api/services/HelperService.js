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

  getManagerOnlyAttributes (modelName) {
    return this.getSchemaAttributes(modelName, 'managerOnlyAttributes', 'managerOnly');
  }

  getReadonlyAttributes (modelName, extras) {
    const attrs = this.getSchemaAttributes(modelName, 'readonlyAttributes', 'readonly');
    return _.union(attrs, extras);
  }

  getAdminOnlyAttributes (modelName) {
    return this.getSchemaAttributes(modelName, 'adminOnlyAttributes', 'adminOnly');
  }

  getSchemaAttributes (modelName, variableName, attributeName) {
    if (!this[variableName] || this[variableName].length === 0) {
      const Model = this.app.orm[modelName];
      this[variableName] = [];
      const that = this;
      Model.schema.eachPath(function (path, options) {
        if (options.options[attributeName]) {
          that[variableName].push(path);
        }
      });
    }
    return this[variableName];
  }

  getOptionsFromQuery(query) {
    return _.pick(query, queryOptions);
  }

  getCriteriaFromQuery(query) {
    let criteria = _.omit(query, queryOptions);
    const keys = Object.keys(criteria);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (criteria[keys[i]] === 'true') {
        criteria[keys[i]] = true;
      }
      if (criteria[keys[i]] === 'false') {
        criteria[keys[i]] = false;
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
