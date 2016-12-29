'use strict';

const Model = require('trails-model');
const Schema = require('mongoose').Schema;
const Mailchimp = require('mailchimp-api-v3');

/**
 * @module Service
 * @description Service
 */
module.exports = class Service extends Model {

  static config () {
    return {
      schema: {
        timestamps: true
      },
      methods: {
        subscribe: function (user) {
          if (this.type === 'mailchimp') {
            return this.subscribeMailchimp(user);
          }
        },

        subscribeMailchimp: function (user) {
          var mc = new Mailchimp(this.mailchimp.apiKey);
          return mc.post({
            path: '/lists/' + this.mailchimp.list.id + '/members'
          }, {
            status: 'subscribed',
            email_address: user.email,
            merge_fields: {'FNAME': user.given_name, 'LNAME': user.family_name}
          });
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
      owner: {
        type: Schema.ObjectId,
        ref: 'User'
      },
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
      googlegroup: googlegroupSchema

    };
  }
};
