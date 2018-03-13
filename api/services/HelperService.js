'use strict';

const Service = require('trails/service');
const crypto = require('crypto');
const _ = require('lodash');
const queryOptions = [
  'populate',
  'limit',
  'offset',
  'sort',
  'fields'
];
const authorizedDomains = [
  'https://humanitarian.id',
  'https://auth.humanitarian.id',
  'https://app2.dev.humanitarian.id',
  'https://api2.dev.humanitarian.id',
  'https://api.humanitarian.id',
  'https://auth.staging.humanitarian.id',
  'https://api.staging.humanitarian.id',
  'https://app.staging.humanitarian.id',
  'https://api.hid.vm'
];

/**
 * @module HelperService
 * @description General Helper Service
 */
module.exports = class HelperService extends Service {

  getOauthParams(args) {
    let params = '';
    if (args.redirect) {
      params += 'redirect=' + args.redirect;
    }
    if (args.client_id) {
      params += '&client_id=' + args.client_id;
    }
    if (args.redirect_uri) {
      params += '&redirect_uri=' + args.redirect_uri;
    }
    if (args.response_type) {
      params += '&response_type=' + args.response_type;
    }
    if (args.scope) {
      params += '&scope=' + args.scope;
    }
    return params;
  }

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

  removeForbiddenAttributes (modelName, request, extras) {
    let forbiddenAttributes = [];
    forbiddenAttributes = this.getReadonlyAttributes(modelName);
    if (!request.params.currentUser || !request.params.currentUser.is_admin) {
      forbiddenAttributes = forbiddenAttributes.concat(this.getAdminOnlyAttributes(modelName));
    }
    if (!request.params.currentUser ||
      (!request.params.currentUser.is_admin && !request.params.currentUser.isManager)) {
      forbiddenAttributes = forbiddenAttributes.concat(this.getManagerOnlyAttributes(modelName));
    }
    forbiddenAttributes = forbiddenAttributes.concat(extras);
    // Do not allow forbiddenAttributes to be updated directly
    for (let i = 0, len = forbiddenAttributes.length; i < len; i++) {
      if (request.payload[forbiddenAttributes[i]]) {
        delete request.payload[forbiddenAttributes[i]];
      }
    }
  }

  getOptionsFromQuery(query) {
    return _.pick(query, queryOptions);
  }

  getCriteriaFromQuery(query) {
    const criteria = _.omit(query, queryOptions);
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

  generateRandom () {
    const buffer = crypto.randomBytes(256);
    return buffer.toString('hex').slice(0, 10);
  }

  find (modelName, criteria, options) {
    const Model = this.app.orm[modelName];
    const query = Model.find(criteria);
    if (options.limit) {
      query.limit(parseInt(options.limit));
    }
    else {
      // Set a default limit
      query.limit(100);
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

  isAuthorizedUrl (url) {
    let out = false;
    for (let i = 0; i < authorizedDomains.length; i++) {
      if (url.indexOf(authorizedDomains[i]) === 0) {
        out = true;
      }
    }
    return out;
  }

  saveTOTPDevice (request, user) {
    this.app.log.debug('Saving device as trusted');
    const random = user.generateHash();
    const tindex = user.trustedDeviceIndex(request.headers['user-agent']);
    if (tindex !== -1) {
      user.totpTrusted[tindex].secret = random;
      user.totpTrusted[tindex].date = Date.now();
    }
    else {
      user.totpTrusted.push({
        secret: random,
        ua: request.headers['user-agent'],
        date: Date.now()
      });
    }
    user.markModified('totpTrusted');
    return user.save();
  }
};
