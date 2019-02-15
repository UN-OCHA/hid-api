'use strict';

const mongoose = require('mongoose');
const fs = require('fs');
const microsoftGraph = require('@microsoft/microsoft-graph-client');

const Schema = mongoose.Schema;

/**
 * @module OutlookSync
 * @description OutlookSync
 */

const OutlookSyncSchema = new Schema({
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
}, {
  collection: 'outlooksync',
  timestamps: true
});

OutlookSyncSchema.methods = {
  getOAuthClient: function () {
    const credentials = JSON.parse(fs.readFileSync('keys/outlook.json'));
    return require('simple-oauth2').create(credentials);
  },

  getContact: function (user) {
    let emails = [];
    user.emails.forEach(function (email) {
      if (email.validated) {
        emails.push({
          address: email.email,
          name: user.name
        });
      }
    });
    let businessPhones = [];
    user.phone_numbers.forEach(function (phone) {
      businessPhones.push(phone.number);
    });
    let companyName = '';
    if (user.organization && user.organization.name) {
      companyName = user.organization.name;
    }
    return {
      givenName: user.given_name,
      surname: user.family_name,
      companyName: companyName,
      emailAddresses: emails,
      businessPhones: businessPhones,
      jobTitle: user.job_title,
      personalNotes: user._id
    };
  },

  folderExists: function (folders) {
    let folderFound = false;
    folders.forEach(function (folder) {
      if (folder.id === this.folder) {
        folderFound = true;
      }
    });
    return folderFound;
  },

  addUser: function (addedUser) {
    const oauth2 = this.getOAuthClient();
    const that = this;
    let accessToken = '', client = {}, folderExists = false;
    return this
      .populate('user')
      .execPopulate()
      .then(() => {
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
        return client
          .api('/me/contactFolders')
          .get();
      })
      .then(res => {
        folderExists = that.folderExists(res.value);
        if (!folderExists) {
          that.remove();
        }
      })
      .then(() => {
        if (folderExists) {
          return client
            .api('/me/contactFolders/' + that.folder + '/contacts')
            .post(that.getContact(addedUser));
        }
      });
  },

  updateUser: function (user) {
    const oauth2 = this.getOAuthClient();
    const that = this;
    let accessToken = '', client = {}, folderExists = false;
    return this
      .populate('user')
      .execPopulate()
      .then(() => {
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
        return client
          .api('/me/contactFolders')
          .get();
      })
      .then(res => {
        folderExists = that.folderExists(res.value);
        if (!folderExists) {
          that.remove();
        }
        else {
          return client
            .api('/me/contactFolders/' + that.folder + '/contacts')
            .get();
        }
      })
      .then(res => {
        if (folderExists && res && res.value) {
          let contactId = '';
          res.value.forEach(function (contact) {
            if (contact.personalNotes === user._id.toString()) {
              contactId = contact.id;
            }
          });
          if (contactId) {
            return client
              .api('/me/contactFolders/' + that.folder + '/contacts/' + contactId)
              .patch(that.getContact(user));
          }
        }
      });
  },

  deleteUser: function (userId) {
    const oauth2 = this.getOAuthClient();
    const that = this;
    let accessToken = '', client = {}, folderExists = false;
    return this
      .populate('user')
      .execPopulate()
      .then(() => {
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
        return client
          .api('/me/contactFolders')
          .get();
      })
      .then(res => {
        folderExists = that.folderExists(res.value);
        if (!folderExists) {
          that.remove();
        }
        else {
          return client
            .api('/me/contactFolders/' + that.folder + '/contacts')
            .get();
        }
      })
      .then(res => {
        if (folderExists && res && res.value) {
          let contactId = '';
          res.value.forEach(function (contact) {
            if (contact.personalNotes === userId) {
              contactId = contact.id;
            }
          });
          if (contactId) {
            return client
              .api('/me/contactFolders/' + that.folder + '/contacts/' + contactId)
              .delete();
          }
        }
      });
  }
};

module.exports = mongoose.model('OutlookSync', OutlookSyncSchema);
