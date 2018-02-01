'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;
const fs = require('fs');
const microsoftGraph = require('@microsoft/microsoft-graph-client');

/**
 * @module OutlookSync
 * @description Outlook sync
 */
module.exports = class OutlookSync extends Model {

  static config () {
    return {
      schema: {
        timestamps: true
      },
      methods: {
        getOAuthClient: function () {
          const credentials = JSON.parse(fs.readFileSync('keys/outlook.json'));
          return require('simple-oauth2').create(credentials);
        },

        addUser: function (addedUser) {
          const oauth2 = this.getOAuthClient();
          const that = this;
          let accessToken = '', client = {};
          return this
            .populate('user')
            .execPopulate()
            .then(user => {
              return oauth2.accessToken.create({refresh_token: that.user.outlookCredentials.refresh_token}).refresh();
            })
            .then(res => {
              accessToken = res.token.access_token;
              // Create a Graph client
              client = microsoftGraph.Client.init({
                authProvider: (done) => {
                  // Just return the token
                  done(null, accessToken);
                }
              });
              let emails = [];
              addedUser.emails.forEach(function (email) {
                emails.push({
                  address: email.email,
                  name: addedUser.name
                });
              });
              return client
                .api('/me/contactFolders/' + that.folder + '/contacts')
                .post({
                  givenName: addedUser.given_name,
                  surname: addedUser.family_name,
                  emailAddresses: emails,
                  personalNotes: addedUser._id
                });
            });
        }
      }
    };
  }

  static schema () {
    return {
      list: {
        type: Schema.ObjectId,
        ref: 'List',
        required: [true, 'A list is required']
      },
      folder: {
        type: String,
        required: [true, 'A folder ID is required']
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      }
    };

  }
};
