'use strict';

const Model = require('trails/model');
const isHTML = require('is-html');
const validate = require('mongoose-validator');

/**
 * @module TrustedDomain
 * @description List of domains for automated verification
 */
module.exports = class TrustedDomain extends Model {

  static config () {
  }

  static schema () {
    const isHTMLValidator = function (v) {
      return !isHTML(v);
    };

    return {
      url: {
        type: String,
        trim: true,
        required: [true, 'URL is invalid'],
        validate: validate({
          validator: 'isURL',
          passIfEmpty: false,
          message: 'URL should be a URL'
        })
      },
      description: {
        type: String,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in description'
        }
      }
    };
  }
};
