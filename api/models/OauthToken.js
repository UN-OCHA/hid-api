const mongoose = require('mongoose');
const crypto = require('crypto');

const { Schema } = mongoose;

/**
 * @module OauthToken
 * @description Oauth Token
 */

const OauthTokenSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['code', 'access', 'refresh'],
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  client: {
    type: Schema.ObjectId,
    ref: 'Client',
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  nonce: {
    type: String,
    default: '',
  },
  expires: {
    type: Date,
  },
}, {
  collection: 'oauthtoken',
});

OauthTokenSchema.methods = {
  isExpired() {
    const now = new Date();
    const { expires } = this;
    return now.getTime() > expires.getTime();
  },
};

OauthTokenSchema.statics = {
  generate(type, client, user, nonce) {
    const buffer = crypto.randomBytes(256);
    const token = crypto
      .createHash('sha1')
      .update(buffer)
      .digest('hex');

    const now = Date.now();
    const ftoken = {
      type,
      token,
      client: client._id,
      user: user._id,
      nonce,
      expires: now + 7 * 24 * 3600 * 1000,
    };
    return ftoken;
  },
};

module.exports = mongoose.model('OauthToken', OauthTokenSchema);
