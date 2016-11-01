'use strict'

const Model = require('trails-model');
const Schema = require('mongoose').Schema;
const Bcrypt = require('bcryptjs');
const Libphonenumber = require('google-libphonenumber');
const Http = require('http');

/**
 * @module User
 * @description User
 */
module.exports = class User extends Model {

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
        hashPassword: function (password) {
          return Bcrypt.hashSync(password, 11)
        },
        explodeHash: function (hashLink) {
          const key = new Buffer(hashLink, 'base64').toString('ascii')
          const parts = key.split('/')
          return {
            'email': parts[0],
            'timestamp': parts[1],
            'hash': new Buffer(parts[2], 'base64').toString('ascii')
          }
        }
      },
      methods: {
        validPassword: function (password)  {
          return Bcrypt.compareSync(password, this.password)
        },

        generateHash: function (email) {
          const now = Date.now()
          return new Buffer(email + "/" + now + "/" + new Buffer(Bcrypt.hashSync(this.password + now + this._id, 11)).toString('base64')).toString('base64')
        },

        // Validate the hash of a confirmation link
        validHash: function (hashLink) {
          const key = new Buffer(hashLink, 'base64').toString('ascii')
          const parts = key.split('/')
          const email = parts[0]
          const timestamp = parts[1]
          const hash = new Buffer(parts[2], 'base64').toString('ascii')
          const now = Date.now()

          // Verify hash
          // verify timestamp is not too old (allow up to 7 days in milliseconds)
          if (timestamp < (now - 7 * 86400000) || timestamp > now) {
            return 'Expired confirmation link'
          }

          if (this.emailIndex(email) == -1) {
            return 'Wrong user or wrong email in the hash';
          }

          // verify hash
          if (!Bcrypt.compareSync(this.password + timestamp + this._id, hash)) {
            return 'This verification link has already been used';
          }
          return true
        },

        emailIndex: function (email) {
          var index = -1
          for (var i = 0, len = this.emails.length; i < len; i++) {
            if (this.emails[i].email == email) {
              index = i
            }
          }
          return index
        },

        toJSON: function () {
          const user = this.toObject()
          delete user.password
          return user
        }
      }
    }
  }

  static schema () {
    const checkInSchema = new Schema({
      list: {
        type: Schema.ObjectId,
        ref: 'List'
      },
      checkoutDate: Date,
      pending: {
        type: Boolean,
        default: true
      }
    });

    return {
      given_name: {
        type: String,
        trim: true,
        required: [true, 'Given name is required']
      },
      middle_name: {
        type: String,
        trim: true
      },
      family_name: {
        type: String,
        trim: true,
        required: [true, 'Family name is required']
      },
      name: {
        type: String
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        unique: true,
        match: /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/
      },
      email_verified: {
        type: Boolean,
        default: false,
        readonly: true
      },
      emails: {
        type: Array,
        validate: {
          validator: function (v) {
            if (v.length) {
              var out = true;
              var emailRegex = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
              for (var i = 0, len = v.length; i < len; i++) {
                if (!v[i].type || (v[i].type != 'Work' && v[i].type != 'Personal') || !v[i].email) {
                  out = false;
                }
                if (!emailRegex.test(v[i].email)) {
                  out = false;
                }
              }
              return out;
            }
            else {
              return true;
            }
          },
          message: 'There is an invalid email'
        }
      },
      password: {
        type: String
      },
      // Only admins can set this
      verified: {
        type: Boolean,
        default: false,
        adminOnly: true
      },
      verified_by: {
        type: Schema.ObjectId,
        ref: 'User',
        readonly: true
      },
      // Makes sure it's a valid URL
      picture: {
        type: String,
        match: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
      },
      notes: {
        type: String
      },
      // Validates an array of VoIP objects
      voips: {
        type: Array,
        validate: {
          validator: function (v) {
            if (v.length) {
              var out = true, types = ['Skype', 'Google'];
              for (var i = 0, len = v.length; i < len; i++) {
                if (!v[i].username || !v[i].type || (v[i].type && types.indexOf(v[i].type) === -1)) {
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
              var out = true;
              var urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
              for (var i = 0, len = v.length; i < len; i++) {
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
        type: String
      },
      locale: {
        type: String,
        enum: ['en', 'fr']
      },
      // TODO :make sure it's a valid organization
      organization: checkInSchema,
      organizations: [ checkInSchema ],
      // Verify valid phone number with libphonenumber and reformat if needed
      phone_number: {
        type: String,
        validate: {
          validator: function (v) {
            if (v != '') {
              const phoneUtil = Libphonenumber.PhoneNumberUtil.getInstance();
              const phone = phoneUtil.parse(v);
              return phoneUtil.isValidNumber(phone);
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
        enum: ['Mobile', 'Landline'],
      },
      phone_numbers: {
        type: Array,
        validate: {
          validator: function (v) {
            if (v.length) {
              const phoneUtil = Libphonenumber.PhoneNumberUtil.getInstance();
              var out = true;
              for (var i = 0, len = v.length; i < len; i++) {
                if (!v[i].type || (v[i].type != 'Mobile' && v[i].type != 'Landline') || !v[i].number) {
                  out = false;
                }
                var phone = phoneUtil.parse(v[i].number);
                if (!phoneUtil.isValidNumber(phone)) {
                  out = false;
                }
              }
              return out;
            }
            else {
              return true;
            }
          },
          message: 'Invalid phone number'
        }
      },
      job_title: {
        type: String
      },
      job_titles: {
        type: Array
      },
      // TODO: Verifies that roles belong to hrinfo functional roles
      roles: {
        type: Array,
        adminOnly: true,
        validate: {
          validator: function (v) {
            if (v.length) {
              var out = true;
              for (var i = 0, len = v.length; i < len; i++) {
                if (!v[i].id || !v[i].label || !v[i].self) {
                  out = false;
                }
              }
              return out;
            }
            else {
              return true;
            }
          },
          message: 'Invalid role found'
        }
      },
      status: {
        type: String
      },
      // TODO: make sure this is a valid location
      location: {
        type: Schema.Types.Mixed
      },
      locations: {
        type: Array
      },
      // Only an admin can set this
      is_admin: {
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
        default: +new Date() + 7*24*60*60*1000,
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
      lists: [ checkInSchema ],
      operations: [ checkInSchema ],
      bundles: [ checkInSchema ],
      disasters: [ checkInSchema ]
    };
  }

  static onSchema(schema) {
    schema.pre('save', function (next) {
      if (this.middle_name) {
        this.name = this.given_name + ' ' + this.middle_name + ' ' + this.family_name
      }
      else {
        this.name = this.given_name + ' ' + this.family_name
      }
      if (!this.email) {
        this.is_ghost = true
      }
      else {
        this.is_ghost = false
      }
      if (this.createdBy && !this.email_verified && this.email) {
        this.is_orphan = true;
      }
      else {
        this.is_orphan = false;
      }
      next ();
    });
    schema.pre('update', function (next) {
      let name, that
      that = this
      this.findOne(function (err, user) {
        if (user.middle_name) {
          name = user.given_name + ' ' + user.middle_name + ' ' + user.family_name
        }
        else {
          name = user.given_name + ' ' + user.family_name
        }
        that.findOneAndUpdate({name: name})
        next()
      })
    });
  }
}
