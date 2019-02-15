'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * @module ServiceCredentials
 * @description ServiceCredentials
 */

const ServiceCredentialsSchema = new Schema({
  type: {
    type: String,
    enum: ['googlegroup'],
    required: [true, 'Type is required']
  },
  googlegroup: {
    domain: {
      type: String
    },
    secrets: Schema.Types.Mixed,
    token: Schema.Types.Mixed
  }
}, {
  collection: 'servicecredentials',
  timestamps: true
});

ServiceCredentialsSchema
  .methods
  .toJSON = function () {
    const creds = this.toObject();
    delete creds.googlegroup.secrets;
    delete creds.googlegroup.token;
    return creds;
  };

module.exports = mongoose.model('ServiceCredentials', ServiceCredentialsSchema);
