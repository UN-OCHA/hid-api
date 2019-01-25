'use strict';

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
  'https://app.dev.humanitarian.id',
  'https://api.dev.humanitarian.id',
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
module.exports = {

  getOauthParams: function (args) {
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
  },

  getManagerOnlyAttributes: function (modelName) {
    return this.getSchemaAttributes(modelName, 'managerOnlyAttributes', 'managerOnly');
  },

  getReadonlyAttributes: function (modelName, extras) {
    const attrs = this.getSchemaAttributes(modelName, 'readonlyAttributes', 'readonly');
    return _.union(attrs, extras);
  },

  getAdminOnlyAttributes: function (modelName) {
    return this.getSchemaAttributes(modelName, 'adminOnlyAttributes', 'adminOnly');
  },

  getSchemaAttributes: function (modelName, variableName, attributeName) {
    if (!this[variableName] || this[variableName].length === 0) {
      this[variableName] = [];
      const that = this;
      modelName.schema.eachPath(function (path, options) {
        if (options.options[attributeName]) {
          that[variableName].push(path);
        }
      });
    }
    return this[variableName];
  },

  removeForbiddenAttributes: function (modelName, request, extras) {
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
  },

  getOptionsFromQuery: function (query) {
    return _.pick(query, queryOptions);
  },

  getCriteriaFromQuery: function (query) {
    const criteria = _.omit(query, queryOptions);
    const keys = Object.keys(criteria);
    const regex = new RegExp(/\[(.*?)\]/);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (keys[i].indexOf('[') !== -1) {
        // Get what's inside the brackets
        const match = keys[i].match(regex);
        const ikey = keys[i].replace(regex, '');
        if (typeof criteria[ikey] === 'undefined') {
          criteria[ikey] = {};
        }
        criteria[ikey]['$' + match[1]] = criteria[keys[i]];
        delete criteria[keys[i]];
      }
      if (criteria[keys[i]] === 'true') {
        criteria[keys[i]] = true;
      }
      if (criteria[keys[i]] === 'false') {
        criteria[keys[i]] = false;
      }
    }
    return criteria;
  },

  generateRandom: function () {
    const buffer = crypto.randomBytes(256);
    return buffer.toString('hex').slice(0, 10);
  },

  find: function (modelName, criteria, options) {
    const query = modelName.find(criteria);
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
  },

  isAuthorizedUrl: function (url) {
    let out = false;
    for (let i = 0; i < authorizedDomains.length; i++) {
      if (url.indexOf(authorizedDomains[i]) === 0) {
        out = true;
      }
    }
    return out;
  },

  saveTOTPDevice: function (request, user) {
    //this.app.log.debug('Saving device as trusted');
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
