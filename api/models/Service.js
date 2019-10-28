const mongoose = require('mongoose');
const Mailchimp = require('mailchimp-api-v3');
const crypto = require('crypto');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const isHTML = require('is-html');

const { Schema } = mongoose;
/**
 * @module Service
 * @description Service
 */

function isHTMLValidator(v) {
  return !isHTML(v);
}

const mailchimpSchema = new Schema({
  apiKey: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in apiKey',
    },
  },
  list: {
    id: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in list id',
      },
    },
    name: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in name',
      },
    },
  },
});

const googlegroupSchema = new Schema({
  domain: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in domain',
    },
  },
  group: {
    id: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in id',
      },
    },
    name: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in name',
      },
    },
    email: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in email',
      },
    },
  },
});

const ServiceSchema = new Schema({
  name: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in name',
    },
  },
  description: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in description',
    },
  },
  legacyId: {
    type: String,
    readonly: true,
  },
  owner: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  managers: [{
    type: Schema.ObjectId,
    ref: 'User',
  }],
  type: {
    type: String,
    enum: ['mailchimp', 'googlegroup'],
    required: [true, 'Service type is required'],
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  hidden: {
    type: Boolean,
    default: false,
  },
  autoAdd: {
    type: Boolean,
    default: false,
  },
  autoRemove: {
    type: Boolean,
    default: false,
  },
  mailchimp: mailchimpSchema,
  googlegroup: googlegroupSchema,
  lists: [{
    type: Schema.ObjectId,
    ref: 'List',
  }],
}, {
  collection: 'service',
  timestamps: true,
});

ServiceSchema.statics = {
  googleGroupsAuthorize(credentials) {
    const clientSecret = credentials.secrets.installed.client_secret;
    const clientId = credentials.secrets.installed.client_id;
    const redirectUrl = credentials.secrets.installed.redirect_uris[0];
    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUrl);
    oauth2Client.setCredentials(credentials.token);
    return oauth2Client;
  },
};

ServiceSchema.methods = {

  subscribeMailchimp(user, email) {
    const mc = new Mailchimp(this.mailchimp.apiKey);
    return mc.post({
      path: `/lists/${this.mailchimp.list.id}/members`,
    }, {
      status: 'subscribed',
      email_address: email,
      merge_fields: { FNAME: user.given_name, LNAME: user.family_name },
    });
  },

  unsubscribeMailchimp(user) {
    const index = user.subscriptionsIndex(this._id);
    const { email } = user.subscriptions[index];
    const mc = new Mailchimp(this.mailchimp.apiKey);
    const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
    return mc.delete({
      path: `/lists/${this.mailchimp.list.id}/members/${hash}`,
    });
  },

  subscribeGoogleGroup(user, email, creds) {
    // Subscribe email to google group
    const auth = ServiceSchema.statics.googleGroupsAuthorize(creds.googlegroup);
    const gservice = google.admin('directory_v1');
    return gservice.members.insert({
      auth,
      groupKey: this.googlegroup.group.id,
      resource: { email, role: 'MEMBER' },
    });
  },

  unsubscribeGoogleGroup(user, creds) {
    const index = user.subscriptionsIndex(this._id);
    const { email } = user.subscriptions[index];
    const auth = ServiceSchema.statics.googleGroupsAuthorize(creds.googlegroup);
    const gservice = google.admin('directory_v1');
    return gservice.members.delete({
      auth,
      groupKey: this.googlegroup.group.id,
      memberKey: email,
    });
  },

  managersIndex(user) {
    let index = -1;
    for (let i = 0; i < this.managers.length; i += 1) {
      if (this.managers[i].id === user.id) {
        index = i;
      }
    }
    return index;
  },

  sanitize(user) {
    if (this.type === 'mailchimp'
      && !user.is_admin
      && user.id !== this.owner
      && this.managersIndex(user) === -1) {
      this.mailchimp.apiKey = '';
    }
  },
};

module.exports = mongoose.model('Service', ServiceSchema);
