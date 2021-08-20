/**
* @module User
* @description User
*/
const mongoose = require('mongoose');
const Bcrypt = require('bcryptjs');
const crypto = require('crypto');
const isHTML = require('is-html');
const validate = require('mongoose-validator');

const { Schema } = mongoose;
const populateClients = [
  { path: 'authorizedClients', select: '_id id name organization environment redirectUri redirectUrls' },
];

function isHTMLValidator(v) {
  return !isHTML(v);
}

const emailSchema = new Schema({
  type: {
    type: String,
    enum: ['Work', 'Personal'],
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true,
    validate: validate({
      validator: 'isEmail',
      passIfEmpty: true,
      message: 'email should be a valid email',
    }),
  },
  validated: {
    type: Boolean,
    default: false,
  },
});

const trustedDeviceSchema = new Schema({
  ua: {
    type: String,
  },
  secret: {
    type: String,
  },
  date: {
    type: Date,
  },
});

const UserSchema = new Schema({
  // Legacy user_id data, to be added during migration
  user_id: {
    type: String,
    readonly: true,
  },
  // Legacy ID data, added during the migration
  legacyId: {
    type: String,
    readonly: true,
  },
  given_name: {
    type: String,
    trim: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in given_name',
    },
    required: [true, 'Given name is required'],
  },
  middle_name: {
    type: String,
    trim: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in middle_name',
    },
  },
  family_name: {
    type: String,
    trim: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in family_name',
    },
    required: [true, 'Family name is required'],
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
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true,
    validate: validate({
      validator: 'isEmail',
      passIfEmpty: true,
      message: 'email should be a valid email',
    }),
  },
  email_verified: {
    type: Boolean,
    default: false,
    readonly: true,
  },
  // Last time the user was reminded to verify his account
  remindedVerify: {
    type: Date,
    readonly: true,
  },
  // How many times the user was reminded to verify his account
  timesRemindedVerify: {
    type: Number,
    default: 0,
    readonly: true,
  },
  // Last time the user was reminded to update his account details
  remindedUpdate: {
    type: Date,
    readonly: true,
  },
  // TODO: mark this as readonly after HID-1499 is fixed
  emails: {
    type: [emailSchema],
    // readonly: true
  },
  password: {
    type: String,
  },
  // Last time the user reset his password
  lastPasswordReset: {
    type: Date,
    readonly: true,
    default: Date.now,
  },
  passwordResetAlert30days: {
    type: Boolean,
    default: false,
    readonly: true,
  },
  passwordResetAlert7days: {
    type: Boolean,
    default: false,
    readonly: true,
  },
  passwordResetAlert: {
    type: Boolean,
    default: false,
    readonly: true,
  },
  notes: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in notes',
    },
  },
  // TODO: validate timezone
  zoneinfo: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in zoneinfo',
    },
  },
  locale: {
    type: String,
    enum: ['en', 'fr', 'es', 'ar'],
    default: 'en',
  },
  job_title: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in job_title',
    },
  },
  job_titles: {
    type: Array,
    validate: {
      validator(v) {
        let out = true;
        if (v.length) {
          for (let i = 0, len = v.length; i < len; i += 1) {
            if (isHTML(v[i])) {
              out = false;
            }
          }
        }
        return out;
      },
      message: 'HTML in job titles is not allowed',
    },
  },
  // Only an admin can set this
  is_admin: {
    type: Boolean,
    default: false,
    adminOnly: true,
  },
  isManager: {
    type: Boolean,
    default: false,
    adminOnly: true,
  },
  expires: {
    type: Date,
    default: () => Date.now() + 7 * 24 * 60 * 60 * 1000,
    readonly: true,
  },
  lastLogin: {
    type: Date,
    readonly: true,
  },
  createdBy: {
    type: Schema.ObjectId,
    ref: 'User',
    readonly: true,
  },
  authorizedClients: [{
    type: Schema.ObjectId,
    ref: 'Client',
  }],
  deleted: {
    type: Boolean,
    default: false,
  },
  hidden: {
    type: Boolean,
    default: false,
    adminOnly: true,
  },
  // Whether the user uses TOTP for security
  totp: {
    type: Boolean,
    default: false,
  },
  totpMethod: {
    type: String,
    enum: ['app'],
  },
  totpConf: {
    type: Schema.Types.Mixed,
    readonly: true,
  },
  totpTrusted: {
    type: [trustedDeviceSchema],
    readonly: true,
  },
  lastModified: {
    type: Date,
    default: Date.now,
    readonly: true,
  },
  auth_time: {
    type: Date,
    readonly: true,
  },
}, {
  timestamps: true,
  toObject: {
    virtuals: true,
  },
  toJSON: {
    virtuals: true,
  },
  collection: 'user',
});

// Index name with collation en_US
UserSchema.index({ name: 1 }, { collation: { locale: 'en_US' } });

/* eslint prefer-arrow-callback: "off", func-names: "off" */
UserSchema.virtual('sub').get(function () {
  return this._id;
});

UserSchema.pre('save', function (next) {
  if (this.middle_name) {
    this.name = `${this.given_name} ${this.middle_name} ${this.family_name}`;
  } else {
    this.name = `${this.given_name} ${this.family_name}`;
  }
  if (!this.user_id) {
    this.user_id = this._id;
  }
  next();
});

UserSchema.post('findOneAndUpdate', function (user) {
  // Calling user.save to go through the presave hook and update user name
  user.save();
});

UserSchema.post('findOne', async function (result, next) {
  if (!result) {
    return next();
  }
  try {
    if (typeof result.populate === 'function') {
      await result.populate(populateClients).execPopulate();
    }
    return next();
  } catch (err) {
    return next(err);
  }
});

UserSchema.statics = {
  explodeHash(hashLink) {
    const key = Buffer.from(hashLink, 'base64').toString('ascii');
    const parts = key.split('/');
    return {
      email: parts[0],
      timestamp: parts[1],
      hash: Buffer.from(parts[2], 'base64').toString('ascii'),
    };
  },

  sanitizeExportedUser(auser, requester) {
    const user = auser;
    if (user._id.toString() !== requester._id.toString() && !requester.is_admin) {
      user.email = null;
      user.emails = [];
    }
  },

  // Password Requirements
  //
  // As of 2020 we follow the most strict guidelines in order to avoid the OICT
  // requirement that we expire weak passwords after 6 months.
  //
  // - At least 12 characters total
  // - At least one number
  // - At least one lowercase letter
  // - At least one uppercase letter
  // - At least one special character: !@#$%^&*()+=\`{}
  isStrongPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()+=\\`{}]).+$/;
    return password.length >= 12 && regex.test(password);
  },

  hashPassword(password) {
    return Bcrypt.hashSync(password, 11);
  },

  // Generate a cryptographically strong random password.
  generateRandomPassword() {
    const buffer = crypto.randomBytes(256);
    return `${buffer.toString('hex').slice(0, 10)}B`;
  },
};

UserSchema.methods = {
  sanitize(user) {
    this.sanitizeClients();
    if (this._id && user._id && this._id.toString() !== user._id.toString() && !user.is_admin) {
      this.email = null;
      this.emails = [];
    }
  },

  getAppUrl() {
    return `${process.env.APP_URL}/users/${this._id}`;
  },

  sanitizeClients() {
    if (this.authorizedClients && this.authorizedClients.length) {
      const sanitized = [];
      for (let i = 0, len = this.authorizedClients.length; i < len; i += 1) {
        if (this.authorizedClients[i].secret) {
          sanitized.push({
            id: this.authorizedClients[i].id,
            name: this.authorizedClients[i].name,
          });
        } else {
          sanitized.push(this.authorizedClients[i]);
        }
      }
    }
  },

  validPassword(password) {
    if (!this.password) {
      return false;
    }
    return Bcrypt.compareSync(password, this.password);
  },

  generateHashPassword() {
    const now = Date.now();
    const value = `${now}:${this.id}:${this.password}`;
    const hash = crypto.createHmac('sha256', process.env.COOKIE_PASSWORD).update(value).digest('hex');
    return {
      timestamp: now,
      hash,
    };
  },

  generateHashEmail(email) {
    const now = Date.now();
    const value = `${now}:${this.id}:${email}`;
    const hash = crypto.createHmac('sha256', process.env.COOKIE_PASSWORD).update(value).digest('hex');
    return {
      timestamp: now,
      hash,
    };
  },

  generateHash() {
    const buffer = crypto.randomBytes(256);
    const now = Date.now();
    const hash = buffer.toString('hex').slice(0, 15);
    return Buffer.from(`${now}/${hash}`).toString('base64');
  },

  // Validate the hash of a password reset link
  validHashPassword(hashLink, time) {
    // Confirm that 24 hours haven't passed.
    const now = Date.now();
    if (now - time > 24 * 3600 * 1000) {
      return false;
    }

    // Create and compare hash
    const value = `${time}:${this.id}:${this.password}`;
    const hash = crypto.createHmac('sha256', process.env.COOKIE_PASSWORD).update(value).digest('hex');

    return hash === hashLink;
  },

  // Validate hash of an email confirmation link.
  validHashEmail(hashLink, time, email) {
    // Confirm that 24 hours haven't passed.
    const now = Date.now();
    if (now - time > 24 * 3600 * 1000) {
      return false;
    }

    // Create and compare hash
    const value = `${time}:${this.id}:${email}`;
    const hash = crypto.createHmac('sha256', process.env.COOKIE_PASSWORD).update(value).digest('hex');
    return hash === hashLink;
  },

  // Validate a generic hash.
  validHash(hashLink) {
    const key = Buffer.from(hashLink, 'base64').toString('ascii');
    const parts = key.split('/');
    const timestamp = parts[0];
    const now = Date.now();

    // Verify hash
    // verify timestamp is not too old (allow up to 7 days in milliseconds)
    if (timestamp < (now - 7 * 86400000) || timestamp > now) {
      return false;
    }
    return true;
  },

  emailIndex(email) {
    let index = -1;
    for (let i = 0, len = this.emails.length; i < len; i += 1) {
      if (this.emails[i].email === email) {
        index = i;
      }
    }
    return index;
  },

  verifyEmail(email) {
    if (this.email === email) {
      this.email_verified = true;
    }
    const index = this.emailIndex(email);
    if (index !== -1) {
      this.emails[index].validated = true;
      this.emails.set(index, this.emails[index]);
    }
  },

  hasAuthorizedClient(clientId) {
    let out = false;
    for (let i = 0, len = this.authorizedClients.length; i < len; i += 1) {
      if (this.authorizedClients[i].id === clientId) {
        out = true;
      }
    }
    return out;
  },

  subscriptionsIndex(serviceId) {
    const id = serviceId.toString();
    let index = -1;
    let subscription = {};
    for (let i = 0; i < this.subscriptions.length; i += 1) {
      subscription = this.subscriptions[i];
      if (subscription.service
        && ((subscription.service._id && subscription.service._id.toString() === id)
        || subscription.service.toString() === id)) {
        index = i;
      }
    }
    return index;
  },

  // Whether we should send a reminder to verify email to user
  // Reminder emails are sent out 2, 4, 7 and 30 days after registration
  shouldSendReminderVerify() {
    const created = new Date(this.createdAt);
    const current = Date.now();
    const remindedVerify = new Date(this.remindedVerify);
    if (this.email_verified) {
      return false;
    }
    if (
      !this.remindedVerify
      && !this.timesRemindedVerify
      && current.valueOf() - created.valueOf() > 48 * 3600 * 1000) {
      return true;
    }
    if (
      this.remindedVerify
      && this.timesRemindedVerify === 1
      && current.valueOf() - remindedVerify.valueOf() > 48 * 3600 * 1000) {
      return true;
    }
    if (
      this.remindedVerify
      && this.timesRemindedVerify === 2
      && current.valueOf() - remindedVerify.valueOf() > 72 * 3600 * 1000) {
      return true;
    }
    if (
      this.remindedVerify
      && this.timesRemindedVerify === 3
      && current.valueOf() - remindedVerify.valueOf() > 23 * 24 * 3600 * 1000) {
      return true;
    }

    return false;
  },

  defaultPopulate() {
    return this.populate(populateClients).execPopulate();
  },

  trustedDeviceIndex(ua) {
    let index = -1;
    for (let i = 0, len = this.totpTrusted.length; i < len; i += 1) {
      if (this.totpTrusted[i].ua === ua) {
        index = i;
      }
    }
    return index;
  },

  isTrustedDevice(ua, secret) {
    const tindex = this.trustedDeviceIndex(ua);
    const offset = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (tindex !== -1
      && this.totpTrusted[tindex].secret === secret
      && offset < this.totpTrusted[tindex].date) {
      return true;
    }
    return false;
  },

  backupCodeIndex(code) {
    let index = -1;
    const numCodes = this.totpConf && this.totpConf.backupCodes
      ? this.totpConf.backupCodes.length
      : 0;

    for (let i = 0; i < numCodes; i++) {
      if (Bcrypt.compareSync(code, this.totpConf.backupCodes[i])) {
        index = i;
      }
    }
    return index;
  },

  isPasswordExpired() {
    const lastPasswordReset = this.lastPasswordReset.valueOf();
    const current = new Date().valueOf();
    if (current - lastPasswordReset > 6 * 30 * 24 * 3600 * 1000) {
      return true;
    }
    return false;
  },

  toJSON() {
    const user = this.toObject();
    delete user.password;
    if (user.totpConf) {
      delete user.totpConf;
    }
    if (user.totpTrusted) {
      for (let i = 0; i < user.totpTrusted.length; i += 1) {
        delete user.totpTrusted[i].secret;
      }
    }
    user.sub = user._id.toString();
    return user;
  },
};

module.exports = mongoose.model('User', UserSchema);
