'use strict';

const Model = require('trails-model');
const Schema = require('mongoose').Schema;

/**
 * @module ListUser
 * @description ListUser model
 */
module.exports = class ListUser extends Model {

  static config () {
    return {
      schema: {
        timestamps: true
      },
      methods: {
        // Whether we should send a reminder checkout email to a user
        shouldSendReminderCheckout: function() {
          let now = Date.now();
          if (!this.checkoutDate || (this.remindedCheckout && this.remindedCheckout === true)) {
            return false;
          }
          var dep = new Date(this.checkoutDate);
          if (now.valueOf() - dep.valueOf() > 48 * 3600 * 1000) {
            return true;
          }
          return false;
        },

        // Whether we should do an automated checkout of a user
        // Users are checked out automatically 14 days after their expected departure date
        shouldDoAutomatedCheckout: function() {
          var now = Date.now();
          if (!this.checkoutDate || !this.remindedCheckout) {
            return false;
          }
          var dep = new Date(this.checkoutDate);
          if (now.valueOf() - dep.valueOf() > 14 * 24 * 3600 * 1000) {
            return true;
          }
          return false;
        }
      }
    };
  }

  static schema () {
    return {
      list: {
        type: Schema.ObjectId,
        ref: 'List'
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      checkoutDate: Date,
      pending: {
        type: Boolean,
        default: true
      },
      remindedCheckout: {
        type: Boolean,
        default: true
      }
    };
  }
};
