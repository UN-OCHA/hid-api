const mongoose = require('mongoose');
const path = require('path');
const ejs = require('ejs');

const { Schema } = mongoose;

/**
 * @module Notification
 * @description Notification
 */

const NotificationSchema = new Schema({
  createdBy: {
    type: Schema.ObjectId,
    ref: 'User',
  },

  text: {
    type: String,
  },

  type: {
    type: String,
  },

  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },

  params: {
    type: Schema.Types.Mixed,
  },

  read: {
    type: Boolean,
    default: false,
  },

  notified: {
    type: Boolean,
    default: false,
  },
}, {
  collection: 'notification',
  timestamps: true,
});

NotificationSchema.index({
  read: 1,
  user: 1,
});

/* eslint prefer-arrow-callback: "off", func-names: "off" */
NotificationSchema.pre('save', async function (next) {
  if (!this.text) {
    let templatePath = `notifications/${this.type}`;
    if (this.user.locale && this.user.locale === 'fr') {
      templatePath += '/fr';
    }
    templatePath += '/html.ejs';
    const template = path.resolve(templatePath);

    try {
      const str = await ejs.renderFile(template, {
        createdBy: this.createdBy,
        user: this.user,
        params: this.params,
      }, {});
      this.text = str;
    } catch (err) {
      return next(err);
    }
  }
  return next();
});

module.exports = mongoose.model('Notification', NotificationSchema);
