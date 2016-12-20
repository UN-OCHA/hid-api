'use strict';

const Model = require('trails-model');
const Schema = require('mongoose').Schema;
const NotificationTemplate = require('email-templates').EmailTemplate;
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
      }
    };
  }

  static onSchema(schema) {

    schema.pre('save', function(next) {
      var templateDir = TemplateDir + this.type;
      var template = new NotificationTemplate(templateDir);
      var that = this;
      template.render({createdBy: that.createdBy, user: that.user, params: that.params}, function(err, result) {
        if (err) {
          return next(err);
        }
        that.text = result.html;
        next();
      });
    });
  }


};
