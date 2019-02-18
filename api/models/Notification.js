

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

NotificationSchema.pre('save', function (next) {
  if (!this.text) {
    const that = this;
    let templatePath = `notifications/${this.type}`;
    if (this.user.locale && this.user.locale === 'fr') {
      templatePath += '/fr';
    }
    templatePath += '/html.ejs';
    const template = path.resolve(templatePath);

    ejs.renderFile(template, {
      createdBy: this.createdBy,
      user: this.user,
      params: this.params,
    }, {}, (err, str) => {
      if (err) {
        return next(err);
      }
      that.text = str;
      next();
    });
  } else {
    next();
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
