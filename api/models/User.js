'use strict';

const Model = require('trails/model');
const Schema = require('mongoose').Schema;
const Bcrypt = require('bcryptjs');
const Libphonenumber = require('google-libphonenumber');
const https = require('https');
const _ = require('lodash');
const crypto = require('crypto');
const isHTML = require('is-html');
const validate = require('mongoose-validator');
const listTypes = ['list', 'operation', 'bundle', 'disaster', 'organization', 'functional_role', 'office'];
const userPopulate1 = [
  {path: 'favoriteLists'},
  {path: 'verified_by', select: '_id name'},
  {path: 'subscriptions.service', select: '_id name'},
  {path: 'connections.user', select: '_id name'},
  {path: 'authorizedClients', select: '_id id name'}
];
const verifiedDomains = [
  'un.org',
  'unicef.org',
  'unhcr.org',
  'wfp.org',
  'iom.int',
  'savethechildren.org',
  'who.int',
  'wvi.org',
  'undp.org',
  'fao.org',
  'unfpa.org',
  'nrc.no',
  'oxfam.org',
  'oxfam.org.uk',
  'ifrc.org',
  'crs.org',
  'plan-international.org',
  'rescue.org',
  'icrc.org',
  'acted.org',
  'internationalmedicalcorps.org',
  'hi-emergency.org',
  'echofield.eu',
  'mercycorps.org',
  'immap.org',
  'concern.net',
  'unwomen.org',
  'undss.org',
  'usaid.gov',
  'dfid.gov.uk',
  'msb.se',
  'medicalteams.org',
  'unhabitat.org',
  'nca.no',
  'mapaction.org',
  'christian-aid.org',
  'tdh.ch',
  'humanitarianresponse.info',
  'humanitarian.id',
  'reliefweb.int',
  'ohchr.org',
  'brs.dk',
  'thw.de'
];

/**
 * @module User
 * @description User
 */
module.exports = class User extends Model {

  // Determines if a password is strong enough for HID
  isStrongPassword (password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    // At least 8 characters and at least one number, one uppercase and one lowercase.
    return password.length > 7 && regex.test(password);
  }

  hashPassword (password) {
    return Bcrypt.hashSync(password, 11);
  }

  // Generate a cryptographically strong random password.
  generateRandomPassword () {
    const buffer = crypto.randomBytes(256);
    return buffer.toString('hex').slice(0, 10) + 'B';
  }

  // TODO: try to remove this duplication after trails v3 is released

  sanitizeExportedUser (user, requester) {
    if (user._id.toString() !== requester._id.toString() && !requester.is_admin) {
      if (user.emailsVisibility !== 'anyone') {
        if ((user.emailsVisibility === 'verified' && !requester.verified) ||
            (user.emailsVisibility === 'connections' && this.connectionsIndex(user, requester._id) === -1)) {
          user.email = null;
          user.emails = [];
        }
      }

      if (user.phonesVisibility !== 'anyone') {
        if ((user.phonesVisibility === 'verified' && !requester.verified) ||
            (user.phonesVisibility === 'connections' && this.connectionsIndex(user, requester._id) === -1)) {
          user.phone_number = null;
          user.phone_numbers = [];
        }
      }

      if (user.locationsVisibility !== 'anyone') {
        if ((user.locationsVisibility === 'verified' && !requester.verified) ||
            (user.locationsVisibility === 'connections' && this.connectionsIndex(user, requester._id) === -1)) {
          user.location = null;
          user.locations = [];
        }
      }
    }
  }

  connectionsIndex (user, userId) {
    let index = -1;
    if (user.connections && user.connections.length) {
      for (let i = 0, len = user.connections.length; i < len; i++) {
        if (user.connections[i].pending === false &&
          ((user.connections[i].user._id && user.connections[i].user._id.toString() === userId.toString()) ||
          (!user.connections[i].user._id && user.connections[i].user.toString() === userId.toString()))) {
          index = i;
        }
      }
    }
    return index;
  }

  translateCheckin (checkin, language) {
    let name = '', nameEn = '', acronym = '', acronymEn = '';
    checkin.names.forEach(function (nameLn) {
      if (nameLn.language === language) {
        name = nameLn.text;
      }
      if (nameLn.language === 'en') {
        nameEn = nameLn.text;
      }
    });
    checkin.acronyms.forEach(function (acroLn) {
      if (acroLn.language === language) {
        acronym = acroLn.text;
      }
      if (acroLn.language === 'en') {
        acronymEn = acroLn.text;
      }
    });
    if (name !== '') {
      checkin.name = name;
    }
    else {
      if (nameEn !== '') {
        checkin.name = nameEn;
      }
    }
    if (acronym !== '') {
      checkin.acronym = acronym;
    }
    else {
      if (acronymEn !== '') {
        checkin.acronym = acronymEn;
      }
    }
  }

  static config () {
    return {
      schema: {
        timestamps: true,
        toObject: {
          virtuals: true
        },
        toJSON: {
          virtuals: true
        }
      },
      statics: {
        explodeHash: function (hashLink) {
          const key = new Buffer(hashLink, 'base64').toString('ascii');
          const parts = key.split('/');
          return {
            'email': parts[0],
            'timestamp': parts[1],
            'hash': new Buffer(parts[2], 'base64').toString('ascii')
          };
        },
        listAttributes: function () {
          return [
            'lists',
            'operations',
            'bundles',
            'disasters',
            'organization',
            'organizations',
            'functional_roles',
            'offices'
          ];
        }
      },
      methods: {
        sanitize: function (user) {
          this.sanitizeClients();
          this.sanitizeLists(user);
          if (this._id.toString() !== user._id.toString() && !user.is_admin) {
            if (this.emailsVisibility !== 'anyone') {
              if ((this.emailsVisibility === 'verified' && !user.verified) ||
                  (this.emailsVisibility === 'connections' && this.connectionsIndex(user._id) === -1)) {
                this.email = null;
                this.emails = [];
              }
            }

            if (this.phonesVisibility !== 'anyone') {
              if ((this.phonesVisibility === 'verified' && !user.verified) ||
                  (this.phonesVisibility === 'connections' && this.connectionsIndex(user._id) === -1)) {
                this.phone_number = null;
                this.phone_numbers = [];
              }
            }

            if (this.locationsVisibility !== 'anyone') {
              if ((this.locationsVisibility === 'verified' && !user.verified) ||
                  (this.locationsVisibility === 'connections' && this.connectionsIndex(user._id) === -1)) {
                this.location = null;
                this.locations = [];
              }
            }
          }
        },
        getAppUrl: function () {
          return process.env.APP_URL + '/users/' + this._id;
        },

        getListIds: function () {
          const that = this;
          const listIds = [];
          listTypes.forEach(function (attr) {
            if (that[attr + 's'].length > 0) {
              that[attr + 's'].forEach(function (lu) {
                if (lu.deleted === false) {
                  listIds.push(lu.list.toString());
                }
              });
            }
          });
          return listIds;
        },

        sanitizeLists: function (user) {
          if (this._id.toString() !== user._id.toString() && !user.is_admin && !user.isManager) {
            const that = this;
            listTypes.forEach(function (attr) {
              _.remove(that[attr + 's'], function (checkin) {
                if (checkin.visibility === 'inlist') {
                  let out = true;
                  // Is user in list ?
                  for (let i = 0; i < user[attr + 's'].length; i++) {
                    if (user[attr + 's'][i].list.toString() === checkin.list.toString() && !user[attr + 's'][i].deleted) {
                      out = false;
                    }
                  }
                  // Is user the owner of the list ?
                  if (checkin.owner && checkin.owner.toString() === user._id.toString()) {
                    out = false;
                  }
                  // Is user a manager of the list ?
                  if (checkin.managers && checkin.managers.length) {
                    for (let i = 0; i < checkin.managers.length; i++) {
                      if (checkin.managers[i].toString() === user._id.toString()) {
                        out = false;
                      }
                    }
                  }
                  return out;
                }
                else if (checkin.visibility === 'me') {
                  let out = true;

                  // Is user the owner of the list ?
                  if (checkin.owner && checkin.owner.toString() === user._id.toString()) {
                    out = false;
                  }
                  // Is user a manager of the list ?
                  if (checkin.managers && checkin.managers.length) {
                    for (let i = 0; i < checkin.managers.length; i++) {
                      if (checkin.managers[i].toString() === user._id.toString()) {
                        out = false;
                      }
                    }
                  }
                  return out;
                }
                else {
                  return checkin.visibility === 'verified' && !user.verified;
                }
              });
            });
          }
        },
        sanitizeClients: function () {
          if (this.authorizedClients && this.authorizedClients.length) {
            const sanitized = [];
            for (let i = 0, len = this.authorizedClients.length; i < len; i++) {
              if (this.authorizedClients[i].secret) {
                sanitized.push({
                  id: this.authorizedClients[i].id,
                  name: this.authorizedClients[i].name
                });
              }
              else {
                sanitized.push(this.authorizedClients[i]);
              }
            }
          }
        },
        validPassword: function (password)  {
          if (!this.password) {
            return false;
          }
          else {
            return Bcrypt.compareSync(password, this.password);
          }
        },

        generateHash: function () {
          const buffer = crypto.randomBytes(256);
          const now = Date.now();
          const hash = buffer.toString('hex').slice(0, 15);
          return new Buffer(now + '/' + hash).toString('base64');
        },

        // Validate the hash of a confirmation link
        validHash: function (hashLink) {
          const key = new Buffer(hashLink, 'base64').toString('ascii');
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

        emailIndex: function (email) {
          let index = -1;
          for (let i = 0, len = this.emails.length; i < len; i++) {
            if (this.emails[i].email === email) {
              index = i;
            }
          }
          return index;
        },

        verifyEmail: function (email) {
          if (this.email === email) {
            this.email_verified = true;
          }
          const index = this.emailIndex(email);
          if (index !== -1) {
            this.emails[index].validated = true;
            this.emails.set(index, this.emails[index]);
          }
        },

        connectionsIndex: function (userId) {
          let index = -1;
          if (this.connections && this.connections.length) {
            for (let i = 0, len = this.connections.length; i < len; i++) {
              if (this.connections[i].user &&
                this.connections[i].pending === false &&
                ((this.connections[i].user._id && this.connections[i].user._id.toString() === userId.toString()) ||
                (!this.connections[i].user._id && this.connections[i].user.toString() === userId.toString()))) {
                index = i;
              }
            }
          }
          return index;
        },

        hasAuthorizedClient: function (clientId) {
          let out = false;
          for (let i = 0, len = this.authorizedClients.length; i < len; i++) {
            if (this.authorizedClients[i].id === clientId) {
              out = true;
            }
          }
          return out;
        },

        subscriptionsIndex: function (serviceId) {
          const id = serviceId.toString();
          let index = -1;
          for (let i = 0; i < this.subscriptions.length; i++) {
            if (this.subscriptions[i].service &&
              ((this.subscriptions[i].service._id && this.subscriptions[i].service._id.toString() === id) ||
              this.subscriptions[i].service.toString() === id)) {
              index = i;
            }
          }
          return index;
        },

        // Whether we should send a reminder to verify email to user
        // Reminder emails are sent out 2, 4, 7 and 30 days after registration
        shouldSendReminderVerify: function() {
          const created = new Date(this.createdAt),
            current = Date.now(),
            remindedVerify = new Date(this.remindedVerify);
          if (this.email_verified || this.is_orphan || this.is_ghost) {
            return false;
          }
          if (!this.remindedVerify && !this.timesRemindedVerify && current.valueOf() - created.valueOf() > 48 * 3600 * 1000) {
            return true;
          }
          if (this.remindedVerify && this.timesRemindedVerify === 1 && current.valueOf() - remindedVerify.valueOf() > 48 * 3600 * 1000) {
            return true;
          }
          if (this.remindedVerify && this.timesRemindedVerify === 2 && current.valueOf() - remindedVerify.valueOf() > 72 * 3600 * 1000) {
            return true;
          }
          if (this.remindedVerify && this.timesRemindedVerify === 3 && current.valueOf() - remindedVerify.valueOf() > 23 * 24 * 3600 * 1000) {
            return true;
          }
          return false;
        },

        // Whether we should send an update reminder (sent out after a user hasn't been updated for 6 months)
        shouldSendReminderUpdate: function () {
          const d = new Date();
          const revisedOffset = d.valueOf() - this.updatedAt.valueOf();
          if (revisedOffset < 183 * 24 * 3600 * 1000) { // if not revised during 6 months
            return false;
          }
          if (this.remindedUpdate) {
            const remindedOffset = d.valueOf() - this.remindedUpdate.valueOf();
            if (remindedOffset < 183 * 24 * 3600 * 1000) {
              return false;
            }
          }
          return true;
        },

        hasLocalPhoneNumber: function (iso2) {
          let found = false;
          const that = this;
          this.phone_numbers.forEach(function (item) {
            const phoneUtil = Libphonenumber.PhoneNumberUtil.getInstance();
            try {
              const phoneNumber = phoneUtil.parse(item.number);
              const regionCode = phoneUtil.getRegionCodeForNumber(phoneNumber);
              if (regionCode.toUpperCase() === iso2) {
                found = true;
              }
            }
            catch (err) {
              // Invalid phone number
              that.log.error('An invalid phone number was found', { error: err });
            }
          });
          return found;
        },

        // Whether the contact is in country or not
        isInCountry: function (pcode, callback) {
          const hrinfoId = this.location.country.id.replace('hrinfo_loc_', '');
          const path = '/api/v1.0/locations/' + hrinfoId,
            that = this;
          https.get({
            host: 'www.humanitarianresponse.info',
            port: 443,
            path: path
          }, function (response) {
            let body = '';
            response.on('data', function (d) {
              body += d;
            });
            response.on('end', function() {
              let parsed = {};
              try {
                parsed = JSON.parse(body);
                if (parsed.data[0].pcode === pcode) {
                  return callback(null, true);
                }
                else {
                  return callback(null, false);
                }
              }
              catch (e) {
                that.log.error('Error parsing hrinfo API', { error: e});
                return callback(e);
              }
            });
          });
        },

        translateCheckin: function (checkin, language) {
          let name = '', nameEn = '', acronym = '', acronymEn = '';
          checkin.names.forEach(function (nameLn) {
            if (nameLn.language === language) {
              name = nameLn.text;
            }
            if (nameLn.language === 'en') {
              nameEn = nameLn.text;
            }
          });
          checkin.acronyms.forEach(function (acroLn) {
            if (acroLn.language === language) {
              acronym = acroLn.text;
            }
            if (acroLn.language === 'en') {
              acronymEn = acroLn.text;
            }
          });
          if (name !== '') {
            checkin.name = name;
          }
          else {
            if (nameEn !== '') {
              checkin.name = nameEn;
            }
          }
          if (acronym !== '') {
            checkin.acronym = acronym;
          }
          else {
            if (acronymEn !== '') {
              checkin.acronym = acronymEn;
            }
          }
        },

        translateListNames: function (language) {
          const that = this;
          listTypes.forEach(function (listType) {
            if (that[listType + 's'] && that[listType + 's'].length) {
              that[listType + 's'].forEach(function (checkin) {
                that.translateCheckin(checkin, language);
              });
            }
          });
          if (this.organization) {
            this.translateCheckin(this.organization, language);
          }
        },

        updateCheckins: function (list) {
          for (let j = 0; j < this[list.type + 's'].length; j++) {
            if (this[list.type + 's'][j].list.toString() === list._id.toString()) {
              this[list.type + 's'][j].name = list.name;
              this[list.type + 's'][j].names = list.names;
              this[list.type + 's'][j].acronym = list.acronym;
              this[list.type + 's'][j].acronyms = list.acronyms;
              this[list.type + 's'][j].owner = list.owner;
              this[list.type + 's'][j].managers = list.managers;
              this[list.type + 's'][j].visibility = list.visibility;
              if (list.type === 'organization') {
                this[list.type + 's'][j].orgTypeId = list.metadata.type.id;
                this[list.type + 's'][j].orgTypeLabel = list.metadata.type.label;
              }
            }
          }
          if (list.type === 'organization' &&
            this.organization &&
            this.organization.list &&
            this.organization.list.toString() === list._id.toString()) {
            this.organization.name = list.name;
            this.organization.names = list.names;
            this.organization.acronym = list.acronym;
            this.organization.acronyms = list.acronyms;
            this.organization.owner = list.owner;
            this.organization.managers = list.managers;
            this.organization.visibility = list.visibility;
            this.organization.orgTypeId = list.metadata.type.id;
            this.organization.orgTypeLabel = list.metadata.type.label;
          }
        },

        defaultPopulate: function () {
          return this
            .populate(userPopulate1)
            .execPopulate();
        },

        trustedDeviceIndex: function (ua) {
          let index = -1;
          for (let i = 0, len = this.totpTrusted.length; i < len; i++) {
            if (this.totpTrusted[i].ua === ua) {
              index = i;
            }
          }
          return index;
        },

        isTrustedDevice: function (ua, secret) {
          const tindex = this.trustedDeviceIndex(ua);
          const offset = Date.now() - 30 * 24 * 60 * 60 * 1000;
          if (tindex !== -1 &&
          this.totpTrusted[tindex].secret === secret &&
          offset < this.totpTrusted[tindex].date) {
            return true;
          }
          else {
            return false;
          }
        },

        backupCodeIndex: function (code) {
          let index = -1;
          for (let i = 0; i < this.totpConf.backupCodes.length; i++) {
            if (Bcrypt.compareSync(code, this.totpConf.backupCodes[i])) {
              index = i;
            }
          }
          return index;
        },

        isPasswordExpired: function () {
          const lastPasswordReset = this.lastPasswordReset.valueOf();
          const current = new Date().valueOf();
          if (current - lastPasswordReset > 6 * 30 * 24 * 3600 * 1000) {
            return true;
          }
          else {
            return false;
          }
        },

        isVerifiableEmail: function (email) {
          let out = false;
          const ind = email.indexOf('@');
          const domain = email.substr((ind+1));
          return verifiedDomains.indexOf(domain) !== -1;
        },

        canBeVerifiedAutomatically: function () {
          const that = this;
          let out = false;
          // Check all emails
          this.emails.forEach(function (email) {
            if (email.validated && that.isVerifiableEmail(email.email)) {
              out = true;
            }
          });
          return out;
        },

        toJSON: function () {
          const user = this.toObject();
          delete user.password;
          delete user.hash;
          delete user.hashAction;
          delete user.hashEmail;
          if (user.totpConf) {
            delete user.totpConf;
          }
          if (user.totpTrusted) {
            for (let i = 0; i < user.totpTrusted.length; i++) {
              delete user.totpTrusted[i].secret;
            }
          }
          if (user.googleCredentials && user.googleCredentials.refresh_token) {
            user.googleCredentials = true;
          }
          else {
            user.googleCredentials = false;
          }
          if (user.outlookCredentials) {
            user.outlookCredentials = true;
          }
          else {
            user.outlookCredentials = false;
          }
          listTypes.forEach(function (attr) {
            _.remove(user[attr + 's'], function (checkin) {
              return checkin.deleted;
            });
          });
          return user;
        }
      },
      onSchema(app, schema) {
        schema.virtual('sub').get(function () {
          return this._id;
        });
        schema.pre('remove', function (next) {
          const that = this;
          // Avoid null connections from being created when a user is removed
          this
            .model('User')
            .find({'connections.user': this._id})
            .then(users => {
              for (let i = 0; i < users.length; i++) {
                for (let j = 0; j < users[i].connections.length; j++) {
                  if (users[i].connections[j].user.toString() === that._id.toString()) {
                    users[i].connections.id(users[i].connections[j]._id).remove();
                  }
                }
                users[i].save();
              }
            })
            .then(() => {
              // Reduce the number of contacts for each list of the user
              let listIds = [];
              listTypes.forEach(function (attr) {
                that[attr + 's'].forEach(function (checkin) {
                  listIds.push(checkin.list);
                });
              });
              return that
                .model('List')
                .update(
                  { _id: { $in: listIds}},
                  { $inc: { count: -1 }}
                );
            })
            .then(() => {
              next();
            })
            .catch(err => {
              next(err);
            });
        });
        schema.pre('save', function (next) {
          if (this.middle_name) {
            this.name = this.given_name + ' ' + this.middle_name + ' ' + this.family_name;
          }
          else {
            this.name = this.given_name + ' ' + this.family_name;
          }
          if (this.is_orphan || this.is_ghost) {
            this.authOnly = false;
          }
          if (!this.user_id) {
            this.user_id = this._id;
          }
          next ();
        });
        schema.post('findOneAndUpdate', function (user) {
          // Calling user.save to go through the presave hook and update user name
          user.save();
        });
        schema.post('findOne', function (result, next) {
          const that = this;
          if (!result) {
            return next();
          }
          result
            .populate(userPopulate1)
            .execPopulate()
            .then(user => {
              return next();
            })
            .catch(err => {
              that.log.error('Error populating user', { error: err });
            });
        });
      }
    };
  }

  static schema () {

    const isHTMLValidator = function (v) {
      return !isHTML(v);
    };

    const visibilities = ['anyone', 'verified', 'connections'];

    const emailSchema = new Schema({
      type: {
        type: String,
        enum: ['Work', 'Personal']
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
          message: 'email should be a valid email'
        })
      },
      validated: {
        type: Boolean,
        default: false
      }
    });

    const phoneSchema = new Schema({
      type: {
        type: String,
        enum: ['Landline', 'Mobile', 'Fax', 'Satellite']
      },
      number: {
        type: String,
        validate: {
          validator: function (v) {
            if (v !== '') {
              try {
                const phoneUtil = Libphonenumber.PhoneNumberUtil.getInstance();
                const phone = phoneUtil.parse(v);
                return phoneUtil.isValidNumber(phone);
              }
              catch (e) {
                return false;
              }
            }
            else {
              return true;
            }
          },
          message: '{VALUE} is not a valid phone number !'
        }
      },
      validated: {
        type: Boolean,
        default: false
      }
    });

    const translationSchema = new Schema({
      language: {
        type: String,
        enum: ['en', 'fr', 'es']
      },
      text: {
        type: String,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in text'
        }
      }
    });

    const connectionSchema = new Schema({
      pending: {
        type: Boolean,
        default: true
      },
      user: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    });

    const listUserSchema = new Schema({
      list: {
        type: Schema.ObjectId,
        ref: 'List'
      },
      name: { type: String},
      names: [translationSchema],
      acronym: { type: String},
      acronyms: [translationSchema],
      acronymsOrNames: {
        type: Schema.Types.Mixed
      },
      owner: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      managers: [{
        type: Schema.ObjectId,
        ref: 'User'
      }],
      visibility: {
        type: String,
        enum: ['me', 'inlist', 'all', 'verified'],
      },
      orgTypeId: {
        type: Number
      },
      orgTypeLabel: {
        type: String,
        enum: [
          'Academic / Research',
          'Civilian',
          'Donor',
          'Embassy',
          'Government',
          'International Military Force',
          'International NGO',
          'International Organization',
          'Media',
          'Military',
          'National NGO',
          'Non state armed groups',
          'Other',
          'Private sector',
          'Red Cross / Red Crescent',
          'Religious',
          'United Nations',
          'Unknown'
        ]
      },
      checkoutDate: Date,
      pending: {
        type: Boolean,
        default: true
      },
      remindedCheckout: {
        type: Boolean,
        default: false
      },
      remindedCheckin: {
        type: Boolean,
        default: false
      },
      deleted: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    });

    const subscriptionSchema = new Schema({
      email: {
        type: String,
        lowercase: true,
        trim: true,
        validate: validate({
          validator: 'isEmail',
          passIfEmpty: false,
          message: 'email should be a valid email'
        }),
        required: true
      },
      service: {
        type: Schema.ObjectId,
        ref: 'Service',
        required: true
      }
    });

    const trustedDeviceSchema = new Schema({
      ua: {
        type: String
      },
      secret: {
        type: String
      },
      date: {
        type: Date
      }
    });

    return {
      // Legacy user_id data, to be added during migration
      user_id: {
        type: String,
        readonly: true
      },
      // Legacy ID data, added during the migration
      legacyId: {
        type: String,
        readonly: true
      },
      given_name: {
        type: String,
        trim: true,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in given_name'
        },
        required: [true, 'Given name is required']
      },
      middle_name: {
        type: String,
        trim: true,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in middle_name'
        }
      },
      family_name: {
        type: String,
        trim: true,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in family_name'
        },
        required: [true, 'Family name is required']
      },
      name: {
        type: String,
        index: true,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in name'
        }
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
          message: 'email should be a valid email'
        })
      },
      email_verified: {
        type: Boolean,
        default: false,
        readonly: true
      },
      // Last time the user was reminded to verify his account
      remindedVerify: {
        type: Date,
        readonly: true
      },
      // How many times the user was reminded to verify his account
      timesRemindedVerify: {
        type: Number,
        default: 0,
        readonly: true
      },
      // Last time the user was reminded to update his account details
      remindedUpdate: {
        type: Date,
        readonly: true
      },
      // TODO: mark this as readonly after HID-1499 is fixed
      emails: {
        type: [emailSchema]
        //readonly: true
      },
      emailsVisibility: {
        type: String,
        enum: visibilities,
        default: 'anyone'
      },
      password: {
        type: String
      },
      // Last time the user reset his password
      lastPasswordReset: {
        type: Date,
        readonly: true,
        default: Date.now
      },
      passwordResetAlert30days: {
        type: Boolean,
        default: false,
        readonly: true
      },
      passwordResetAlert7days: {
        type: Boolean,
        default: false,
        readonly: true
      },
      passwordResetAlert: {
        type: Boolean,
        default: false,
        readonly: true
      },
      // Only admins can set this
      verified: {
        type: Boolean,
        default: false,
        managerOnly: true
      },
      verified_by: {
        type: Schema.ObjectId,
        ref: 'User',
        readonly: true
      },
      verifiedOn: {
        type: Date,
        readonly: true
      },
      verificationExpiryEmail: {
        type: Boolean,
        default: false,
        readonly: true
      },
      // Makes sure it's a valid URL, and do not allow urls from other domains
      picture: {
        type: String,
        validate: validate({
          validator: 'isURL',
          passIfEmpty: true,
          arguments: {host_whitelist: ['api.humanitarian.id', 'api2.dev.humanitarian.id']},
          message: 'picture should be a valid URL'
        })
      },
      notes: {
        type: String,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in notes'
        }
      },
      // Validates an array of VoIP objects
      voips: {
        type: Array,
        validate: {
          validator: function (v) {
            if (v.length) {
              let out = true;
              const types = ['Skype', 'Google', 'Facebook', 'Yahoo', 'Twitter'];
              for (let i = 0, len = v.length; i < len; i++) {
                if (!v[i].username || !v[i].type || (v[i].type && types.indexOf(v[i].type) === -1)) {
                  out = false;
                }
                if (v[i].username && isHTML(v[i].username)) {
                  out = false;
                }
              }
              return out;
            }
            else {
              return true;
            }
          },
          message: 'Invalid voip found'
        }
      },
      // Validates urls
      websites: {
        type: Array,
        validate: {
          validator: function (v) {
            if (v.length) {
              let out = true;
              const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;
              for (let i = 0, len = v.length; i < len; i++) {
                if (!urlRegex.test(v[i].url)) {
                  out = false;
                }
              }
              return out;
            }
            else {
              return true;
            }
          },
          message: 'There is an invalid url'
        }
      },
      // TODO: validate timezone
      zoneinfo: {
        type: String,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in zoneinfo'
        }
      },
      locale: {
        type: String,
        enum: ['en', 'fr', 'es', 'ar'],
        default: 'en'
      },
      organization: {
        type: listUserSchema,
        readonly: true
      },
      organizations: {
        type: [listUserSchema],
        readonly: true
      },
      // Verify valid phone number with libphonenumber and reformat if needed
      phone_number: {
        type: String,
        validate: {
          validator: function (v) {
            if (v !== '') {
              try {
                const phoneUtil = Libphonenumber.PhoneNumberUtil.getInstance();
                const phone = phoneUtil.parse(v);
                return phoneUtil.isValidNumber(phone);
              }
              catch (e) {
                return false;
              }
            }
            else {
              return true;
            }
          },
          message: '{VALUE} is not a valid phone number !'
        }
      },
      phone_number_type: {
        type: String,
        enum: ['Mobile', 'Landline', 'Fax', 'Satellite', ''],
      },
      // TODO: mark this as readonly when HID-1506 is fixed
      phone_numbers: {
        type: [phoneSchema]
        //readonly: true
      },
      phonesVisibility: {
        type: String,
        enum: visibilities,
        default: 'anyone'
      },
      job_title: {
        type: String,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in job_title'
        }
      },
      job_titles: {
        type: Array,
        validate: {
          validator: function (v) {
            let out = true;
            if (v.length) {
              for (let i = 0, len = v.length; i < len; i++) {
                if (isHTML(v[i])) {
                  out = false;
                }
              }
            }
            return out;
          },
          message: 'HTML in job titles is not allowed'
        }
      },
      functional_roles: [listUserSchema],
      status: {
        type: String,
        validate: {
          validator: isHTMLValidator,
          message: 'HTML code is not allowed in status field'
        }
      },
      // TODO: figure out validation
      location: {
        type: Schema.Types.Mixed
        /*validate: validate({
          validator: 'isJSON',
          passIfEmpty: true,
          message: 'location should be valid JSON'
        })*/
      },
      // TODO: figure out validation
      locations: {
        type: Array
        /*validate: validate({
          validator: 'isJSON',
          passIfEmpty: true,
          message: 'locations should be valid JSON'
        })*/
      },
      locationsVisibility: {
        type: String,
        enum: visibilities,
        default: 'anyone'
      },
      // Only an admin can set this
      is_admin: {
        type: Boolean,
        default: false,
        adminOnly: true
      },
      isManager: {
        type: Boolean,
        default: false,
        adminOnly: true
      },
      is_orphan: {
        type: Boolean,
        default: false,
        readonly: true
      },
      is_ghost: {
        type: Boolean,
        default: false,
        readonly: true
      },
      expires: {
        type: Date,
        default: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        readonly: true
      },
      lastLogin: {
        type: Date,
        readonly: true
      },
      createdBy: {
        type: Schema.ObjectId,
        ref: 'User',
        readonly: true
      },
      favoriteLists: [{
        type: Schema.ObjectId,
        ref: 'List'
      }],
      lists: {
        type: [listUserSchema],
        readonly: true
      },
      operations: {
        type: [listUserSchema],
        readonly: true
      },
      bundles: {
        type: [listUserSchema],
        readonly: true
      },
      disasters: {
        type: [listUserSchema],
        readonly: true
      },
      offices: {
        type: [listUserSchema],
        readonly: true
      },
      authorizedClients: [{
        type: Schema.ObjectId,
        ref: 'Client'
      }],
      subscriptions: {
        type: [subscriptionSchema],
        readonly: true
      },
      connections: {
        type: [connectionSchema],
        readonly: true
      },
      // TODO: figure out validation
      appMetadata: {
        type: Schema.Types.Mixed
        /*validate: validate({
          validator: 'isJSON',
          passIfEmpty: true,
          message: 'appMetadata should be valid JSON'
        })*/
      },
      hash: {
        type: String,
        readonly: true
      },
      hashAction: {
        type: String,
        enum: ['verify_email', 'reset_password'],
        readonly: true
      },
      hashEmail: {
        type: String,
        readonly: true,
        validate: validate({
          validator: 'isEmail',
          passIfEmpty: true,
          message: 'hashEmail should be a valid email'
        })
      },
      deleted: {
        type: Boolean,
        default: false
      },
      // Whether this user is only using auth
      authOnly: {
        type: Boolean,
        default: true
      },
      // Whether the user uses TOTP for security
      totp: {
        type: Boolean,
        default: false
      },
      totpMethod: {
        type: String,
        enum: ['app']
      },
      totpConf: {
        type: Schema.Types.Mixed,
        readonly: true
      },
      totpTrusted: {
        type: [trustedDeviceSchema],
        readonly: true
      },
      googleCredentials: {
        type: Schema.Types.Mixed,
        readonly: true,
        default: false
      },
      outlookCredentials: {
        type: Schema.Types.Mixed,
        readonly: true,
        default: false
      },
      lastModified: {
        type: Date,
        default: Date.now,
        readonly: true
      }
    };
  }
};
