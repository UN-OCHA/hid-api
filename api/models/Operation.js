'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;

/**
 * @module Operation
 * @description Operation
 */
module.exports = class Operation extends Model {

  static config () {
    return {
      methods: {
        managersIndex: function (user) {
          let index = -1;
          for (let i = 0; i < this.managers.length; i++) {
            if (this.managers[i].id === user.id) {
              index = i;
            }
          }
          return index;
        },
      }
    };
  }

  static schema () {
    return {
      remote_id: {
        type: Number,
        readonly: true
      },
      managers: [{
        type: Schema.ObjectId,
        ref: 'User'
      }],
      url: {
        type: String,
        readonly: true
      },
      key_lists: [{
        type: Schema.ObjectId,
        ref: 'List'
      }],
      key_roles: [{
        type: Schema.ObjectId,
        ref: 'List'
      }]
    };

  }
};
