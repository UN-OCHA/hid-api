/* eslint prefer-arrow-callback: "off", func-names: "off" */
/**
* @module User
* @description User
*/

const Hoek = require('@hapi/hoek');
const mongoose = require('mongoose');
const validate = require('mongoose-validator');
const Bcrypt = require('bcryptjs');
const crypto = require('crypto');
const isHTML = require('is-html');
const cracklib = require('cracklib');
const config = require('../../config/env');

const { logger } = config;
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
  //
  // TODO: remove
  user_id: {
    type: String,
    readonly: true,
  },

  // Legacy ID data, added during the migration
  //
  // TODO: remove
  legacyId: {
    type: String,
    readonly: true,
  },

  // Given/first name.
  given_name: {
    type: String,
    trim: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in given_name',
    },
    required: [true, 'Given name is required'],
  },

  // Middle name
  //
  // TODO: remove.
  middle_name: {
    type: String,
    trim: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in middle_name',
    },
  },

  // Family/last name.
  family_name: {
    type: String,
    trim: true,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in family_name',
    },
    required: [true, 'Family name is required'],
  },

  // Full name.
  name: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in name',
    },
  },

  // Primary email address.
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

  // Whether the user has proven ownership of the email address by activating a
  // confirmation link sent to the address.
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

  // Recovery emails.
  emails: {
    type: [emailSchema],
  },

  // Hash of the current user password.
  password: {
    type: String,
  },

  // When a password gets updated, we store up to 5 old password hashes to meet
  // UN-OICT requirements. The user may not re-use a password until four others
  // have been set.
  oldPasswords: {
    type: Array,
  },

  // Last time the user reset their password
  lastPasswordReset: {
    type: Date,
    readonly: true,
    default: Date.now,
  },

  // HID Contacts "bio" field
  //
  // TODO: remove
  notes: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in notes',
    },
  },

  // HID Contacts timezone field
  //
  // TODO: remove
  zoneinfo: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in zoneinfo',
    },
  },

  // HID Contacts language preference
  //
  // TODO: remove
  locale: {
    type: String,
    enum: ['en', 'fr', 'es', 'ar'],
    default: 'en',
  },

  // HID Contacts "Job Title" field
  //
  // TODO: remove
  job_title: {
    type: String,
    validate: {
      validator: isHTMLValidator,
      message: 'HTML code is not allowed in job_title',
    },
  },

  // HID Contacts secondary "Job Title" fields
  //
  // TODO: remove
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

  // Flag to indicate whether a user is an HID admin.
  is_admin: {
    type: Boolean,
    default: false,
    adminOnly: true,
  },

  // HID Contacts legacy Manager role
  //
  // TODO: remove
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

  // HID Contacts metadata
  //
  // TODO: remove
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

  // HID Contacts: internal flag indicating user was deleted.
  //
  // TODO: remove
  deleted: {
    type: Boolean,
    default: false,
  },

  // HID Contacts: internal flag to hide a user.
  //
  // TODO: remove
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

  // TOTP config that for some reason lives outside totpConf...
  totpMethod: {
    type: String,
    enum: ['app'],
  },

  // TOTP config
  totpConf: {
    type: Schema.Types.Mixed,
    readonly: true,
  },

  // 2FA users can mark a browser as trusted for 30 days
  totpTrusted: {
    type: [trustedDeviceSchema],
    readonly: true,
  },

  // Timestamp noting when user was last modified.
  lastModified: {
    type: Date,
    default: Date.now,
    readonly: true,
  },

  // Time of last login to HID itself. No relation to OAuth logins.
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

  /**
   * Password strength
   *
   * This represents 2021 OICT guidance on strong passwords in order to avoid
   * the requirement that we expire weak passwords after 6 months.
   *
   * - At least 12 characters total
   * - At least one number
   * - At least one lowercase letter
   * - At least one uppercase letter
   * - At least one special character: !@#$%^&*()+=\`{}[]:";'< >?,./
   */
  isStrongPassword(password) {
    // eslint-disable-next-line no-useless-escape
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()+=\\`{}[\]:";'< >?,.\/-]).+$/;
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

  /**
   * Compares a string to current password hash.
   *
   * @return {boolean}
   */
  validPassword(passwordToCompare) {
    // If no password is set, we do not want to return a false positive, so we
    // preemptively return false.
    if (!this.password) {
      return false;
    }

    // Compare to current password.
    return Bcrypt.compareSync(passwordToCompare, this.password);
  },

  /**
   * Password dictionary test
   *
   * Check a password against a standard dictionary that does some substitutions
   * involving numbers, compares against common patterns, and other well-known
   * sources of "inspiration" for weak passwords.
   *
   * @return {boolean}
   */
  isStrongDictionary(password) {
    // We use fascistCheckUser() and will pass the following into successive
    // runs of the function:
    //
    // - Given name
    // - Family name
    // - Each email on the profile (regardless of confirmation status)
    const comparisons = [
      this.given_name,
      this.family_name,
    ];
    this.emails.forEach(email => {
      comparisons.push(email.email);
    })

    // Compare the password to all reference strings.
    const results = comparisons.map(thisComparison => {
      let thisResult;

      // Do direct string comparison, which the library doesn't always catch if
      // enough randomness is tacked onto the end.
      thisResult = password.toLowerCase().indexOf(thisComparison.toLowerCase()) !== -1 ? 'exact string match found' : false;

      // Bail early if we found a really obvious match.
      if (thisResult) {
        return thisResult;
      }

      // The library returns an object with a `message` property. If that property
      // is set to `null` then the password passed. If it contains a string then
      // the password failed the dictionary test.
      thisResult = cracklib.fascistCheckUser(password, thisComparison).message;

      // If the result is NOT `null` then it failed and we'll log the message
      // separate from the main operation taking place that invoked this function.
      if (thisResult !== null) {
        logger.warn(
          `[User->isStrongDictionary] Password failed dictionary test: ${thisResult}`,
          {
            security: true,
            fail: true,
          },
        );
      }

      // Return this particular result.
      return thisResult;
    });

    // Finally, test if EVERY result is `null`
    // If there's one failure, then our overall result is a failure.
    return results.every(val => val === null);
  },

  /**
   * Compares a string to historical/current password hashes.
   *
   * @return {boolean}
   */
  isHistoricalPassword(passwordToCompare) {
    // If no password is set, we do not want to return a false positive, so we
    // preemptively return false.
    if (!this.password) {
      return false;
    }

    // Compare to historical password hashes.
    //
    // `map` compares each stored hash to the new password.
    // `some` returns TRUE if it finds any TRUE value in the array.
    const oldPasswords = Hoek.clone(this.oldPasswords);
    const hasHistoricalMatches = oldPasswords
      .map(old => Bcrypt.compareSync(passwordToCompare, old))
      .some(isTrue => isTrue);

    // If historical matches are found return true, or compare to the current
    // password hash.
    return hasHistoricalMatches || Bcrypt.compareSync(passwordToCompare, this.password);
  },

  /**
   * Copies the current password hash to the oldPasswords array.
   */
  storePasswordInHistory() {
    // Store the current password hash in the oldPasswords array.
    const oldPasswords = this.oldPasswords || [];
    oldPasswords.push(this.password);

    // Do not keep more than five old hashes.
    while (oldPasswords.length > 5) {
      oldPasswords.shift();
    }
  },

  generateHashPassword(emailId) {
    const now = Date.now();
    const value = `${now}:${this.id}:${this.password}:${emailId}`;
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
  validHashPassword(hashLink, time, emailId) {
    // Confirm that 24 hours haven't passed.
    const now = Date.now();
    if (now - time > 24 * 3600 * 1000) {
      return false;
    }

    // See @HID-2219
    const valueLegacy = `${time}:${this.id}:${this.password}`;
    const hashLegacy = crypto.createHmac('sha256', process.env.COOKIE_PASSWORD).update(valueLegacy).digest('hex');

    // Create email-enabled hash
    const value = `${time}:${this.id}:${this.password}:${emailId}`;
    const hash = crypto.createHmac('sha256', process.env.COOKIE_PASSWORD).update(value).digest('hex');

    // Temporarily compare either legacy or new hash. Only one has to match.
    // @see HID-2219
    return hash === hashLink || hashLegacy === hashLink;
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

  /**
   * Returns the array index of the email you want, using the email address.
   *
   * @param {string} An email address
   * @returns {number} The index of the emails array, or -1 when not found.
   */
  emailIndex(email) {
    let index = -1;
    for (let i = 0, len = this.emails.length; i < len; i++) {
      if (this.emails[i].email === email.toLowerCase()) {
        index = i;
      }
    }
    return index;
  },

  /**
   * Returns the array index of the email you want, using the email's ID.
   *
   * @param {string} The ObjectId of the email
   * @returns {number} The index of the emails array, or -1 when not found.
   */
  emailIndexFromId(emailId) {
    let index = -1;
    for (let i = 0, len = this.emails.length; i < len; i++) {
      if (this.emails[i]._id.toString() === emailId) {
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

  toJSON() {
    const user = this.toObject();
    delete user.password;

    if (user.oldPasswords) {
      delete user.oldPasswords;
    }

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
