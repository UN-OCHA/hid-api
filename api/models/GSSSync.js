'use strict';

const mongoose = require('mongoose');
const {OAuth2Client} = require('google-auth-library');
const fs = require('fs');

const Schema = mongoose.Schema;

/**
 * @module GSSSync
 * @description GSSSync
 */

const GSSSyncSchema = new Schema({
  list: {
    type: Schema.ObjectId,
    ref: 'List',
    required: [true, 'A list is required']
  },
  spreadsheet: {
    type: String,
    required: [true, 'A spreadsheet ID is required']
  },
  sheetId: {
    type: String,
    required: [true, 'A sheet ID is required']
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
}, {
  collection: 'gsssync',
  timestamps: true
});

GSSSyncSchema.statics = {
  getSpreadsheetHeaders: function () {
    return [
      'Humanitarian ID',
      'First Name',
      'Last Name',
      'Job Title',
      'Organization',
      'Groups',
      'Roles',
      'Country',
      'Admin Area',
      'Phone number',
      'Skype',
      'Email',
      'Notes'
    ];
  },
  getUserAttributes: function () {
    return [
      'name',
      'given_name',
      'family_name',
      'email',
      'job_title',
      'phone_number',
      'status',
      'organization',
      'bundles',
      'location',
      'voips',
      'connections',
      'phonesVisibility',
      'emailsVisibility',
      'locationsVisibility',
      'createdAt',
      'updatedAt',
      'is_orphan',
      'is_ghost',
      'verified',
      'isManager',
      'is_admin',
      'functional_roles'
    ].join(' ');
  }
};

GSSSyncSchema.methods = {
  getAuthClient: function () {
    // Authenticate with Google
    const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
    const authClient = new OAuth2Client(creds.web.client_id, creds.web.client_secret, 'postmessage');
    authClient.setCredentials(this.user.googleCredentials);
    return authClient;
  },

  getUserCriteria: function () {
    const list = this.list;
    const criteria = {};
    if (list.isVisibleTo(this.user)) {
      criteria[list.type + 's'] = {$elemMatch: {list: list._id, deleted: false}};
      if (!list.isOwner(this.user)) {
        criteria[list.type + 's'].$elemMatch.pending = false;
      }
    }
    return criteria;
  }
};

GSSSyncSchema.index({list: 1, spreadsheet: 1}, { unique: true});

module.exports = mongoose.model('GSSSync', GSSSyncSchema);
