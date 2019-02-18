

const mongoose = require('mongoose');
const fs = require('fs');
const microsoftGraph = require('@microsoft/microsoft-graph-client');
const simpleOauth2 = require('simple-oauth2');

const { Schema } = mongoose;

/**
 * @module OutlookSync
 * @description OutlookSync
 */

const OutlookSyncSchema = new Schema({
  list: {
    type: Schema.ObjectId,
    ref: 'List',
    required: [true, 'A list is required'],
  },
  folder: {
    type: String,
    required: [true, 'A folder ID is required'],
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
}, {
  collection: 'outlooksync',
  timestamps: true,
});

OutlookSyncSchema.methods = {
  getOAuthClient() {
    const credentials = JSON.parse(fs.readFileSync('keys/outlook.json'));
    return simpleOauth2.create(credentials);
  },

  getContact(user) {
    const emails = [];
    user.emails.forEach((email) => {
      if (email.validated) {
        emails.push({
          address: email.email,
          name: user.name,
        });
      }
    });
    const businessPhones = [];
    user.phone_numbers.forEach((phone) => {
      businessPhones.push(phone.number);
    });
    let companyName = '';
    if (user.organization && user.organization.name) {
      companyName = user.organization.name;
    }
    return {
      givenName: user.given_name,
      surname: user.family_name,
      companyName,
      emailAddresses: emails,
      businessPhones,
      jobTitle: user.job_title,
      personalNotes: user._id,
    };
  },

  folderExists(folders) {
    let folderFound = false;
    folders.forEach((folder) => {
      if (folder.id === this.folder) {
        folderFound = true;
      }
    });
    return folderFound;
  },

  async addUser(addedUser) {
    const oauth2 = this.getOAuthClient();
    await this
      .populate('user')
      .execPopulate();
    const res = await oauth2.accessToken.create({
      refresh_token: this.user.outlookCredentials.refresh_token,
    }).refresh();
    const accessToken = res.token.access_token;
    // Create a Graph client
    const client = microsoftGraph.Client.init({
      authProvider: (done) => {
        // Just return the token
        done(null, accessToken);
      },
    });
    const res2 = await client.api('/me/contactFolders').get();
    const folderExists = this.folderExists(res2.value);
    if (!folderExists) {
      this.remove();
    } else {
      await client.api(`/me/contactFolders/${this.folder}/contacts`)
        .post(this.getContact(addedUser));
    }
  },

  async updateUser(user) {
    const oauth2 = this.getOAuthClient();
    await this
      .populate('user')
      .execPopulate();
    const res = await oauth2.accessToken.create({
      refresh_token: this.user.outlookCredentials.refresh_token,
    }).refresh();
    const accessToken = res.token.access_token;
    // Create a Graph client
    const client = microsoftGraph.Client.init({
      authProvider: (done) => {
        // Just return the token
        done(null, accessToken);
      },
    });
    const res2 = await client.api('/me/contactFolders').get();
    const folderExists = this.folderExists(res2.value);
    if (!folderExists) {
      this.remove();
    } else {
      const res3 = await client
        .api(`/me/contactFolders/${this.folder}/contacts`)
        .get();
      if (res3 && res3.value) {
        let contactId = '';
        res3.value.forEach((contact) => {
          if (contact.personalNotes === user._id.toString()) {
            contactId = contact.id;
          }
        });
        if (contactId) {
          await client
            .api(`/me/contactFolders/${this.folder}/contacts/${contactId}`)
            .patch(this.getContact(user));
        }
      }
    }
  },

  async deleteUser(userId) {
    const oauth2 = this.getOAuthClient();
    await this
      .populate('user')
      .execPopulate();
    const res = await oauth2.accessToken.create({
      refresh_token: this.user.outlookCredentials.refresh_token,
    }).refresh();
    const accessToken = res.token.access_token;
    // Create a Graph client
    const client = microsoftGraph.Client.init({
      authProvider: (done) => {
        // Just return the token
        done(null, accessToken);
      },
    });
    const res2 = await client
      .api('/me/contactFolders')
      .get();
    const folderExists = this.folderExists(res2.value);
    if (!folderExists) {
      this.remove();
    } else {
      const res3 = await client
        .api(`/me/contactFolders/${this.folder}/contacts`)
        .get();
      if (res3 && res3.value) {
        let contactId = '';
        res3.value.forEach((contact) => {
          if (contact.personalNotes === userId) {
            contactId = contact.id;
          }
        });
        if (contactId) {
          await client
            .api(`/me/contactFolders/${this.folder}/contacts/${contactId}`)
            .delete();
        }
      }
    }
  },
};

module.exports = mongoose.model('OutlookSync', OutlookSyncSchema);
