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
              var out = false;
              // Is user in list ?
              for (var i = 0; i < user[this.type + 's'].length; i++) {
                if (user[this.type + 's'][i].list === this._id) {
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
          var ownerId = '';
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
          var managerFound = false;
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
          return managerFound;
        },
        languageIndex: function (attr, language) {
          var index = -1;
          if (this[attr] && this[attr].length) {
            for (var i = 0; i < this[attr].length; i++) {
              if (this[attr][i].language === language) {
                index = i;
              }
            }
          }
          return index;
        },
        translatedAttribute: function (attr, language) {
          var index = this.languageIndex(attr, language);
          if (index === -1) {
            index = this.languageIndex(attr, 'en');
          }
          if (index !== -1) {
            return this[attr][index].text;
          }
          else {
            var singularAttr = attr.substr(-1);
            return this[singularAttr];
          }
        }
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
        type: String
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
        enum: ['operation', 'bundle', 'disaster', 'list', 'organization', 'functional_role', 'office'],
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

  static onSchema(schema) {
    schema.pre('save', function (next) {
      if (this.acronym) {
        this.name = this.label + ' (' + this.acronym + ')';
      }
      else {
        this.name = this.label;
      }
      var that = this;
      languages.forEach(function (lang) {
        var labelIndex = that.languageIndex('labels', lang);
        var nameIndex = that.languageIndex('names', lang);
        var acronymIndex = that.languageIndex('acronyms', lang);
        var name = '';
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
      var that = this;
      languages.forEach(function (lang) {
        var labelIndex = that.languageIndex('labels', lang);
        var nameIndex = that.languageIndex('names', lang);
        var acronymIndex = that.languageIndex('acronyms', lang);
        var name = '';
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
