'use strict'

const Model = require('trails-model')
const Schema = require('mongoose').Schema

/**
 * @module List
 * @description List Model
 */
module.exports = class List extends Model {

  static config () {
  }

  static schema () {
    return {
      name: {
        type: String,
        trim: true,
        required: [true, 'Name is required']
      },

      type: {
        type: 'string',
        enum: ['operation', 'bundle', 'disaster', 'list'],
        required: [true, 'Type is required']
      },

      visibility: {
        type: 'string',
        enum: ['me', 'inlist', 'all', 'verified'],
        required: [true, 'Visibility is required']
      },

      joinability: {
        type: 'string',
        enum: ['public', 'moderated', 'private'],
        required: [true, 'Joinability is required']
      },

      owner: {
        type: Schema.ObjectId,
        ref: 'User'
      },

      managers: [{
        type: Schema.ObjectId,
        ref: 'User'
      }]
    }
  }

  static onSchema(schema) {
    schema.post('remove', function (next) {
      console.log('Entering remove');
      console.log(this);
      orm['listuser'].find({list: this._id}).remove(function (err) {
        console.log('removed listusers');
        next ();
      });
    });
  }

}
