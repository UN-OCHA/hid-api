'use strict'

const Model = require('trails-model')

/**
 * @module Client
 * @description OAuth Client
 */
module.exports = class Client extends Model {

  static config () {
    return {
      methods: {
        toJSON: function () {
          const client = this.toObject()
          delete client.secret
          return client
        }
      }
    }
  }

  static schema () {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
   return {
      id: {
        type: String,
        trim: true,
        required: [true, 'Client ID is required']
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
    }
  }
}
