'use strict';

const Model = require('trails/model');

/**
 * @module Client
 * @description OAuth Client
 */
module.exports = class Client extends Model {

  static config () {
  }

  static schema () {
    const urlRegex = /(http(s)?)/gi;
    return {
      id: {
        type: String,
        trim: true,
        required: [true, 'Client ID is required'],
        unique: true
      },
      name: {
        type: String,
        trim: true,
        required: [true, 'Client name is required']
      },
      secret: {
        type: String,
        trim: true,
        required: [true, 'Client secret is required']
      },
      url: {
        type: String,
        trim: true,
        match: urlRegex
      },
      redirectUri: {
        type: String,
        trim: true,
        required: [true, 'Redirect uri is required'],
        match: urlRegex
      },
      loginUri: {
        type: String,
        trim: true,
        match: urlRegex
      },
      description: {
        type: String
      }
    };
  }
};
