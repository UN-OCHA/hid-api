'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;
const NotificationTemplate = require('email-templates');
const TemplateDir = require('path').join(__dirname, '../../notifications/');


/**
 * @module Notification
 * @description Notification
 */
module.exports = class Notification extends Model {

  static config () {
    return {
      schema: {
        timestamps: true
      },
      onSchema(app, schema) {

        schema.pre('save', function(next) {
          if (!this.text) {
            const template = new NotificationTemplate({
              views: {
                root: TemplateDir,
                options: {
                  extension: 'ejs',
                }
              },
              transport: {
                jsonTransport: true
              }
            });
            const that = this;
            template
              .render(this.type, {
                createdBy: that.createdBy,
                user: that.user,
                params: that.params
              })
              .then((result) => {
                that.text = result.html;
                next();
              })
              .catch(err => {
                return next(err);
              });
          }
          else {
            next();
          }
        });
      }
    };
  }

  static schema () {
    return {
      createdBy: {
        type: Schema.ObjectId,
        ref: 'User'
      },

      text: {
        type: String
      },

      type: {
        type: String
      },

      user: {
        type: Schema.ObjectId,
        ref: 'User'
      },

      params: {
        type: Schema.Types.Mixed
      },

      read: {
        type: Boolean,
        default: false
      },

      notified: {
        type: Boolean,
        default: false
      }
    };
  }


};
