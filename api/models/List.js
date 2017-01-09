'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;

/**
 * @module List
 * @description List Model
 */
module.exports = class List extends Model {

  static config () {
    return {
      schema: {
        timestamps: true
      },
      methods: {
        getAppUrl: function () {
          return process.env.APP_URL + '/lists/' + this._id;
        },
        isVisibleTo: function (user, ListUser, cb) {
          if (user.is_admin ||
            this.visibility === 'all' ||
            (this.visibility === 'verified' && user.verified) ||
            this.owner === user.id ||
            this.managers.indexOf(user.id) !== -1) {
            return cb(true);
          }
          else {
            if (this.visibility === 'inlist') {
              // Is user in list ?
              ListUser
                .findOne({user: user._id, list: this._id})
                .then((lu) => {
                  if (lu) {
                    return cb(true);
                  }
                  else {
                    return cb(false);
                  }
                });
            }
            else {
              return cb(false);
            }
          }
        },
        isOwner: function (user) {
          if (user.is_admin ||
            this.owner === user.id ||
            this.managers.indexOf(user.id) !== -1) {
              return true;
          }
          else {
            return false;
          }
        }
      }
    };
  }

  static schema () {
    return {
      name: {
        type: String
      },

      // Acronym for organizations
      acronym: {
        type: String,
        trim: true
      },

      label: {
        type: String,
        trim: true,
        required: [true, 'Label is required']
      },

      type: {
        type: String,
        enum: ['operation', 'bundle', 'disaster', 'list', 'organization'],
        required: [true, 'Type is required']
      },

      visibility: {
        type: String,
        enum: ['me', 'inlist', 'all', 'verified'],
        required: [true, 'Visibility is required']
      },

      joinability: {
        type: String,
        enum: ['public', 'moderated', 'private'],
        required: [true, 'Joinability is required']
      },

      remote_id: {
        type: Number,
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

      metadata: {
        type: Schema.Types.Mixed,
        readonly: true
      },

      deleted: {
        type: Boolean,
        default: false,
        readonly: true
      }
    };
  }

  static onSchema(schema) {
    schema.pre('save', function (next) {
      if (this.acronym) {
        this.name = this.label + ' (' + this.acronym + ')';
      }
      else {
        this.name = this.label;
      }
      next ();
    });
    schema.pre('update', function (next) {
      if (this.acronym) {
        this.name = this.label + ' (' + this.acronym + ')';
      }
      else {
        this.name = this.label;
      }
      next();
    });
  }

};
