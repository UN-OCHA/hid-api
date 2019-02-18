

const mongoose = require('mongoose');
const isHTML = require('is-html');
const validate = require('mongoose-validator');

const { Schema } = mongoose;

/**
 * @module TrustedDomain
 * @description Trusted Domain
 */

function isHTMLValidator (v) {
  return !isHTML(v);
};

const TrustedDomainSchema = new Schema({
  url: {
    type: String,
    trim: true,
    required: [true, 'URL is invalid'],
    validate: validate({
      validator: 'isURL',
      passIfEmpty: false,
      message: 'URL should be a URL',
    }),
  },
  description: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in description',
    },
  },
  list: {
    type: Schema.ObjectId,
    ref: 'List',
  },
}, {
  collection: 'trusteddomain',
});

module.exports = mongoose.model('TrustedDomain', TrustedDomainSchema);
