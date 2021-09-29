/**
 * @module Client
 * @description OAuth Client
 */
const URL = require('url');
const mongoose = require('mongoose');
const isHTML = require('is-html');
const validate = require('mongoose-validator');

const { Schema } = mongoose;

function isHTMLValidator(v) {
  return !isHTML(v);
}

const ClientSchema = new Schema({
  id: {
    type: String,
    trim: true,
    required: [true, 'Client ID is required'],
    unique: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in id',
    },
  },
  name: {
    type: String,
    trim: true,
    required: [true, 'Client name is required'],
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in name',
    },
  },
  secret: {
    type: String,
    trim: true,
    required: [true, 'Client secret is required'],
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in secret',
    },
  },
  url: {
    type: String,
    trim: true,
    validate: validate({
      validator: 'isURL',
      passIfEmpty: true,
      message: 'URL should be a URL',
    }),
  },
  redirectUri: {
    type: String,
    trim: true,
    validate: validate({
      validator: 'isURL',
      passIfEmpty: false,
      message: 'redirectUri should be a URL',
    }),
  },
  redirectUrls: [{
    type: String,
    validate: validate({
      validator: 'isURL',
      passIfEmpty: false,
      message: 'redirectUrl should be a URL',
    }),
  }],
  loginUri: {
    type: String,
    trim: true,
    validate: validate({
      validator: 'isURL',
      passIfEmpty: true,
      message: 'loginUri should be a URL',
    }),
  },
  description: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in description',
    },
  },
  organization: {
    type: String,
    required: false,
    default: '',
    maxlength: 32,
  },
  environment: {
    type: String,
    required: false,
    default: '',
    maxlength: 32,
  },
}, {
  collection: 'client',
});

ClientSchema.virtual('urlDisplay').get(function buildVirtual() {
  let tmpUrl;
  if (this.redirectUri) {
    tmpUrl = this.redirectUri;
  } else if (typeof this.redirectUrls === 'object') {
    tmpUrl = this.redirectUrls[0];
  } else {
    tmpUrl = false;
  }

  // If found, format the URL.
  if (tmpUrl) {
    const clientUrl = URL.parse(tmpUrl);
    return clientUrl.hostname;
  }

  // If all else fails, return empty string.
  return '';
});

ClientSchema.virtual('urlHref').get(function buildVirtual() {
  let tmpUrl;
  if (this.redirectUri) {
    tmpUrl = this.redirectUri;
  } else if (typeof this.redirectUrls === 'object') {
    tmpUrl = this.redirectUrls[0];
  } else {
    tmpUrl = false;
  }

  // If found, format the URL.
  if (tmpUrl) {
    const clientUrl = URL.parse(tmpUrl);
    return `${clientUrl.protocol}//${clientUrl.hostname}`;
  }

  // If all else fails, return empty string.
  return '';
});

module.exports = mongoose.model('Client', ClientSchema);
