'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;
const languages = ['en', 'fr', 'es'];

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
        isVisibleTo: function (user) {
          if (this.isOwner(user) ||
            this.visibility === 'all' ||
            (this.visibility === 'verified' && user.verified)) {
            return true;
          }
          else {
            if (this.visibility === 'inlist') {
              let out = false;
              // Is user in list ?
              for (let i = 0; i < user[this.type + 's'].length; i++) {
                if (user[this.type + 's'][i].list.toString() === this._id.toString() && !user[this.type + 's'][i].deleted) {
                  out = true;
                }
              }
              return out;
            }
            else {
              return false;
            }
          }
        },
        isOwner: function (user) {
          let ownerId = '';
          if (this.owner) {
            if (this.owner._id) {
              ownerId = this.owner._id.toString();
            }
            else {
              ownerId = this.owner.toString();
            }
          }
          if (user.is_admin ||
            ownerId === user._id.toString() ||
            this.isManager(user)) {
            return true;
          }
          else {
            return false;
          }
        },
        isManager: function (user) {
          let managerFound = false;
          if (this.managers && this.managers.length) {
            this.managers.forEach(function (manager) {
              if (manager.id && manager.id === user.id) {
                managerFound = true;
              }
              else {
                if (manager.toString() === user._id.toString()) {
                  managerFound = true;
                }
              }
            });
          }
          return managerFound;
        },
        languageIndex: function (attr, language) {
          let index = -1;
          if (this[attr] && this[attr].length) {
            for (let i = 0; i < this[attr].length; i++) {
              if (this[attr][i].language === language) {
                index = i;
              }
            }
          }
          return index;
        },
        translatedAttribute: function (attr, language) {
          let index = this.languageIndex(attr, language);
          if (index === -1) {
            index = this.languageIndex(attr, 'en');
          }
          if (index !== -1) {
            return this[attr][index].text;
          }
          else {
            const singularAttr = attr.substr(-1);
            return this[singularAttr];
          }
        }
      },
      onSchema(app, schema) {
        schema.pre('save', function (next) {
          if (this.acronym) {
            this.name = this.label + ' (' + this.acronym + ')';
          }
          else {
            this.name = this.label;
          }
          const that = this;
          languages.forEach(function (lang) {
            const labelIndex = that.languageIndex('labels', lang);
            const nameIndex = that.languageIndex('names', lang);
            const acronymIndex = that.languageIndex('acronyms', lang);
            let name = '';
            if (labelIndex !== -1) {
              if (acronymIndex !== -1 && that.acronyms[acronymIndex].text !== '') {
                name = that.labels[labelIndex].text + ' (' + that.acronyms[acronymIndex].text + ')';
              }
              else {
                name = that.labels[labelIndex].text;
              }
              if (nameIndex !== -1) {
                that.names[nameIndex].text = name;
              }
              else {
                that.names.push({language: lang, text: name});
              }
            }
          });
          next ();
        });
        schema.pre('update', function (next) {
          if (this.acronym) {
            this.name = this.label + ' (' + this.acronym + ')';
          }
          else {
            this.name = this.label;
          }
          const that = this;
          languages.forEach(function (lang) {
            const labelIndex = that.languageIndex('labels', lang);
            const nameIndex = that.languageIndex('names', lang);
            const acronymIndex = that.languageIndex('acronyms', lang);
            let name = '';
            if (labelIndex !== -1) {
              if (acronymIndex !== -1 && that.acronyms[acronymIndex].text !== '') {
                name = that.labels[labelIndex].text + ' (' + that.acronyms[acronymIndex].text + ')';
              }
              else {
                name = that.labels[labelIndex].text;
              }
              if (nameIndex !== -1) {
                that.names[nameIndex].text = name;
              }
              else {
                that.names.push({language: lang, text: name});
              }
            }
          });
          next();
        });
      }
    };
  }

  static schema () {
    const translationSchema = new Schema({
      language: {
        type: String,
        enum: ['en', 'fr', 'es']
      },
      text: {
        type: String
      }
    });

    return {
      name: {
        type: String,
        readonly: true
      },

      names: [translationSchema],

      // Acronym for organizations
      acronym: {
        type: String,
        trim: true
      },

      acronyms: [translationSchema],

      label: {
        type: String,
        trim: true,
        required: [true, 'Label is required']
      },

      labels: [translationSchema],

      type: {
        type: String,
        enum: [
          'operation',
          'bundle',
          'disaster',
          'list',
          'organization',
          'functional_role',
          'office'
        ],
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

      legacyId: {
        type: String,
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

};
