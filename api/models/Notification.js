'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;
const path = require('path');
const EJS = require('ejs');


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
            const template = path.resolve('notifications/' + this.type + '/html.ejs');

            this.text = new EJS({url: template}).render({
                createdBy: this.createdBy,
                user: this.user,
                params: this.params
              });
            next();
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
