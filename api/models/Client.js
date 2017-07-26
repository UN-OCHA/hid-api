'use strict';

const Model = require('trails/model');
const isHTML = require('is-html');

/**
 * @module Client
 * @description OAuth Client
 */
module.exports = class Client extends Model {

  static config () {
  }

  static schema () {
    const isHTMLValidator = function (v) {
      return !isHTML(v);
    };

    return {
      id: {
        type: String,
        trim: true,
        required: [true, 'Client ID is required'],
        unique: true,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in id'
        }
      },
      name: {
        type: String,
        trim: true,
        required: [true, 'Client name is required'],
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in name'
        }
      },
      secret: {
        type: String,
        trim: true,
        required: [true, 'Client secret is required'],
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in secret'
        }
      },
      // TODO: add validation
      url: {
        type: String,
        trim: true
      },
      // TODO: add validation
      redirectUri: {
        type: String,
        trim: true,
        required: [true, 'Redirect uri is required']
      },
      // TODO: add validation
      loginUri: {
        type: String,
        trim: true
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
