

const mongoose = require('mongoose');

const { Schema } = mongoose;
const languages = ['en', 'fr', 'es'];
const isHTML = require('is-html');

/**
 * @module List
 * @description List Model
 */

function isHTMLValidator(v) {
  return !isHTML(v);
}

const translationSchema = new Schema({
  language: {
    type: String,
    enum: ['en', 'fr', 'es'],
  },
  text: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in text',
    },
  },
});

const ListSchema = new Schema({
  name: {
    type: String,
    readonly: true,
    index: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in name',
    },
  },

  names: [translationSchema],

  // Acronym for organizations
  acronym: {
    type: String,
    trim: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in acronym',
    },
  },

  acronyms: [translationSchema],

  label: {
    type: String,
    trim: true,
    required: [true, 'Label is required'],
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in label',
    },
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
      'office',
    ],
    required: [true, 'Type is required'],
  },

  visibility: {
    type: String,
    enum: ['me', 'inlist', 'all', 'verified'],
    required: [true, 'Visibility is required'],
  },

  joinability: {
    type: String,
    enum: ['public', 'moderated', 'private'],
    required: [true, 'Joinability is required'],
  },

  remote_id: {
    type: Number,
    readonly: true,
  },

  legacyId: {
    type: String,
    readonly: true,
  },

  owner: {
    type: Schema.ObjectId,
    ref: 'User',
  },

  managers: [{
    type: Schema.ObjectId,
    ref: 'User',
  }],

  metadata: {
    type: Schema.Types.Mixed,
    readonly: true,
  },

  count: {
    type: Number,
    default: 0,
    readonly: true,
  },

  // Number of contacts in the list with authOnly = false
  countVisible: {
    type: Number,
    default: 0,
    readonly: true,
  },

  deleted: {
    type: Boolean,
    default: false,
    readonly: true,
  },
}, {
  timestamps: true,
  collection: 'list',
});

/* eslint prefer-arrow-callback: "off", func-names: "off" */
ListSchema.pre('save', function (next) {
  if (this.acronym) {
    this.name = `${this.label} (${this.acronym})`;
  } else {
    this.name = this.label;
  }
  const that = this;
  languages.forEach((lang) => {
    const labelIndex = that.languageIndex('labels', lang);
    const nameIndex = that.languageIndex('names', lang);
    const acronymIndex = that.languageIndex('acronyms', lang);
    let name = '';
    if (labelIndex !== -1) {
      if (acronymIndex !== -1 && typeof that.acronyms[acronymIndex].text === 'undefined') {
        that.acronyms[acronymIndex].text = '';
        if (!that.acronymsOrNames) {
          that.acronymsOrNames = [];
        }
        if (typeof that.acronymsOrNames[lang] === 'undefined') {
          that.acronymsOrNames[lang] = that.labels[labelIndex].text;
        }
      }
      if (acronymIndex !== -1 && that.acronyms[acronymIndex].text !== '') {
        name = `${that.labels[labelIndex].text} (${that.acronyms[acronymIndex].text})`;
      } else {
        name = that.labels[labelIndex].text;
      }
      if (nameIndex !== -1) {
        that.names[nameIndex].text = name;
      } else {
        that.names.push({ language: lang, text: name });
      }
    }
  });
  next();
});

ListSchema.post('findOneAndUpdate', function (list) {
  // Calling list.save to go through the presave hook and update list name
  list.save();
});

ListSchema.index(
  { remote_id: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { remote_id: { $exists: true } },
  },
);

ListSchema.methods = {
  getAppUrl() {
    return `${process.env.APP_URL}/lists/${this._id}`;
  },

  isVisibleTo(user) {
    if (this.isOwner(user)
      || this.visibility === 'all'
      || (this.visibility === 'verified' && user.verified)) {
      return true;
    } if (this.visibility === 'inlist') {
      let out = false;
      // Is user in list ?
      for (let i = 0; i < user[`${this.type}s`].length; i += 1) {
        if (user[`${this.type}s`][i].list.toString() === this._id.toString() && !user[`${this.type}s`][i].deleted) {
          out = true;
        }
      }
      return out;
    }

    return false;
  },

  isOwner(user) {
    let ownerId = '';
    if (this.owner) {
      if (this.owner._id) {
        ownerId = this.owner._id.toString();
      } else {
        ownerId = this.owner.toString();
      }
    }
    if (user.is_admin
      || ownerId === user._id.toString()
      || this.isManager(user)) {
      return true;
    }
    return false;
  },

  isManager(user) {
    let managerFound = false;
    if (this.managers && this.managers.length) {
      this.managers.forEach((manager) => {
        if (manager.id && manager.id === user.id) {
          managerFound = true;
        } else if (manager.toString() === user._id.toString()) {
          managerFound = true;
        }
      });
    }
    return managerFound;
  },

  languageIndex(attr, language) {
    let index = -1;
    if (this[attr] && this[attr].length) {
      for (let i = 0; i < this[attr].length; i += 1) {
        if (this[attr][i].language === language) {
          index = i;
        }
      }
    }
    return index;
  },

  translatedAttribute(attr, language) {
    let index = this.languageIndex(attr, language);
    if (index === -1) {
      index = this.languageIndex(attr, 'en');
    }
    if (index === -1) {
      index = 0;
    }
    if (index !== -1 && this[attr][index]) {
      return this[attr][index].text;
    }
    const singularAttr = attr.substr(-1);
    return this[singularAttr];
  },
};

module.exports = mongoose.model('List', ListSchema);
