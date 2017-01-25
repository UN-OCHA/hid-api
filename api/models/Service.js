'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;
const Mailchimp = require('mailchimp-api-v3');
const crypto = require('crypto');
const google = require('googleapis');
const GoogleAuth = require('google-auth-library');
const async = require('async');

/**
 * @module Service
 * @description Service
 */
module.exports = class Service extends Model {

  static config () {
    var googleGroupsAuthorize = function (credentials, cb) {
      var clientSecret = credentials.secrets.installed.client_secret;
      var clientId = credentials.secrets.installed.client_id;
      var redirectUrl = credentials.secrets.installed.redirect_uris[0];
      var auth = new GoogleAuth();
      var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
      oauth2Client.credentials = credentials.token;
      cb(oauth2Client);
    };
    return {
      schema: {
        timestamps: true
      },
      statics: {
        googleGroupsAuthorize: googleGroupsAuthorize
      },
      methods: {

        subscribeMailchimp: function (user, email) {
          var mc = new Mailchimp(this.mailchimp.apiKey);
          return mc.post({
            path: '/lists/' + this.mailchimp.list.id + '/members'
          }, {
            status: 'subscribed',
            email_address: email,
            merge_fields: {'FNAME': user.given_name, 'LNAME': user.family_name}
          });
        },

        unsubscribeMailchimp: function (user) {
          var index = user.subscriptionsIndex(this._id);
          var email = user.subscriptions[index].email;
          var mc = new Mailchimp(this.mailchimp.apiKey);
          var hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
          return mc.delete({
            path: '/lists/' + this.mailchimp.list.id + '/members/' + hash
          });
        },

        subscribeGoogleGroup: function (user, email, creds, cb) {
          let that = this;
          // Subscribe email to google group
          googleGroupsAuthorize(creds.googlegroup, function (auth) {
            var gservice = google.admin('directory_v1');
            gservice.members.insert({
              auth: auth,
              groupKey: that.googlegroup.group.id,
              resource: { 'email': email, 'role': 'MEMBER' }
            }, cb);
          });
        },

        unsubscribeGoogleGroup: function (user, creds, cb) {
          var index = user.subscriptionsIndex(this._id);
          var email = user.subscriptions[index].email;
          let that = this;
          googleGroupsAuthorize(creds.googlegroup, function (auth) {
            var gservice = google.admin('directory_v1');
            gservice.members.delete({
              auth: auth,
              groupKey: that.googlegroup.group.id,
              memberKey: email
            }, cb);
          });
        },

        managersIndex: function (user) {
          var index = -1;
          for (var i = 0; i < this.managers.length; i++) {
            if (this.managers[i].id === user.id) {
              index = i;
            }
          }
          return index;
        },

        sanitize: function (user) {
          if (this.type === 'mailchimp' && !user.is_admin && user.id !== this.owner && this.managersIndex(user) === -1) {
            this.mailchimp.apiKey = '';
          }
        }
      }
    };
  }

  static schema () {
    const mailchimpSchema = new Schema({
      apiKey: {
        type: String
      },
      list: {
        id: String,
        name: String
      }
    });

    const googlegroupSchema = new Schema({
      domain: {
        type: String
      },
      group: {
        id: String,
        name: String,
        email: String
      }
    });

    return {
      name: {
        type: String
      },
      description: {
        type: String
      },
      legacyId: {
        type: String,
        readonly: true
      },
      owner: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      managers: [{
        type: Schema.ObjectId,
        ref: 'User'
      }],
      type: {
        type: String,
        enum: ['mailchimp', 'googlegroup'],
        required: [true, 'Service type is required']
      },
      deleted: {
        type: Boolean,
        default: false
      },
      hidden: {
        type: Boolean,
        default: false
      },
      autoAdd: {
        type: Boolean,
        default: false
      },
      autoRemove: {
        type: Boolean,
        default: false
      },
      mailchimp: mailchimpSchema,
      googlegroup: googlegroupSchema,
      lists: [{
        type: Schema.ObjectId,
        ref: 'List'
      }]
    };
  }
};
