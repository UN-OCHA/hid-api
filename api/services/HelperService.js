/**
* @module HelperService
* @description General Helper Service
*/

const crypto = require('crypto');
const _ = require('lodash');
const { allowedDomains } = require('../../config/env');

const queryOptions = [
  'populate',
  'limit',
  'offset',
  'sort',
  'fields',
];

function getSchemaAttributes(modelName, variableName, attributeName) {
  const output = [];
  modelName.schema.eachPath((path, options) => {
    if (options.options[attributeName]) {
      output.push(path);
    }
  });
  return output;
}


module.exports = {

  getOauthParams(args) {
    let params = '';
    if (args.redirect) {
      params += `redirect=${args.redirect}`;
    }
    if (args.client_id) {
      params += `&client_id=${args.client_id}`;
    }
    if (args.redirect_uri) {
      params += `&redirect_uri=${args.redirect_uri}`;
    }
    if (args.response_type) {
      params += `&response_type=${args.response_type}`;
    }
    if (args.scope) {
      params += `&scope=${args.scope}`;
    }
    return params;
  },

  removeForbiddenAttributes(modelName, request, extras) {
    let forbiddenAttributes = [];
    const attrs = getSchemaAttributes(modelName, 'readonlyAttributes', 'readonly');
    forbiddenAttributes = _.union(attrs, extras);
    if (!request.auth.credentials || !request.auth.credentials.is_admin) {
      forbiddenAttributes = forbiddenAttributes.concat(getSchemaAttributes(modelName, 'adminOnlyAttributes', 'adminOnly'));
    }
    if (!request.auth.credentials
      || (!request.auth.credentials.is_admin && !request.auth.credentials.isManager)) {
      forbiddenAttributes = forbiddenAttributes.concat(getSchemaAttributes(modelName, 'managerOnlyAttributes', 'managerOnly'));
    }
    forbiddenAttributes = forbiddenAttributes.concat(extras);
    // Do not allow forbiddenAttributes to be updated directly
    for (let i = 0, len = forbiddenAttributes.length; i < len; i += 1) {
      if (request.payload[forbiddenAttributes[i]]) {
        delete request.payload[forbiddenAttributes[i]];
      }
    }
  },

  getOptionsFromQuery(query) {
    return _.pick(query, queryOptions);
  },

  getCriteriaFromQuery(query) {
    const criteria = _.omit(query, queryOptions);
    const keys = Object.keys(criteria);
    const regex = new RegExp(/\[(.*?)\]/);
    for (let i = 0, len = keys.length; i < len; i += 1) {
      if (keys[i].indexOf('[') !== -1) {
        // Get what's inside the brackets
        const match = keys[i].match(regex);
        const ikey = keys[i].replace(regex, '');
        if (typeof criteria[ikey] === 'undefined') {
          criteria[ikey] = {};
        }
        criteria[ikey][`$${match[1]}`] = criteria[keys[i]];
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

  generateRandom() {
    const buffer = crypto.randomBytes(256);
    return buffer.toString('hex').slice(0, 10);
  },

  find(modelName, criteria, options) {
    const query = modelName.find(criteria);
    if (options.limit) {
      query.limit(parseInt(options.limit, 10));
    } else {
      // Set a default limit
      query.limit(100);
    }
    if (options.offset) {
      query.skip(parseInt(options.offset, 10));
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

  isAuthorizedUrl(url) {
    let out = false;
    for (let i = 0; i < allowedDomains.length; i++) {
      if (url.indexOf(allowedDomains[i]) === 0) {
        out = true;
      }
    }
    return out;
  },

  saveTOTPDevice(request, auser) {
    const user = auser;
    const random = user.generateHash();
    const tindex = user.trustedDeviceIndex(request.headers['user-agent']);
    if (tindex !== -1) {
      user.totpTrusted[tindex].secret = random;
      user.totpTrusted[tindex].date = Date.now();
    } else {
      user.totpTrusted.push({
        secret: random,
        ua: request.headers['user-agent'],
        date: Date.now(),
      });
    }
    user.markModified('totpTrusted');
    return user.save();
  },
};
