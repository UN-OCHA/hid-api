const mongoose = require('mongoose');
const crypto = require('crypto');
const isHTML = require('is-html');

const { Schema } = mongoose;
/**
 * @module Service
 * @description Service
 */

function isHTMLValidator(v) {
  return !isHTML(v);
}

const mailchimpSchema = new Schema({
  apiKey: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in apiKey',
    },
  },
  list: {
    id: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in list id',
      },
    },
    name: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in name',
      },
    },
  },
});

const googlegroupSchema = new Schema({
  domain: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in domain',
    },
  },
  group: {
    id: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in id',
      },
    },
    name: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in name',
      },
    },
    email: {
      type: String,
      validate: {
        validator: isHTMLValidator,
        message: 'HTML code is not allowed in email',
      },
    },
  },
});

const ServiceSchema = new Schema({
  name: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in name',
    },
  },
  description: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in description',
    },
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
  type: {
    type: String,
    enum: ['mailchimp', 'googlegroup'],
    required: [true, 'Service type is required'],
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  hidden: {
    type: Boolean,
    default: false,
  },
  autoAdd: {
    type: Boolean,
    default: false,
  },
  autoRemove: {
    type: Boolean,
    default: false,
  },
  mailchimp: mailchimpSchema,
  googlegroup: googlegroupSchema,
  lists: [{
    type: Schema.ObjectId,
    ref: 'List',
  }],
}, {
  collection: 'service',
  timestamps: true,
});

module.exports = mongoose.model('Service', ServiceSchema);
