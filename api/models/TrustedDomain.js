'use strict';

const Model = require('trails/model');
const validate = require('mongoose-validator');

/**
 * @module TrustedDomain
 * @description List of domains for automated verification
 */
module.exports = class TrustedDomain extends Model {

  static config () {
  }

  static schema () {

    return {
      url: {
        type: String,
        trim: true,
        required: [true, 'URL is invalid']
        validate: validate({
          validator: 'isURL',
          passIfEmpty: false,
          message: 'URL should be a URL'
        })
      }
    };
  }
};
