'use strict'

const Model = require('trails-model');
const Schema = require('mongoose').Schema;
const Bcrypt = require('bcryptjs');

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

        generateHash: function () {
          const now = Date.now()
          return new Buffer(this.email + "/" + now + "/" + new Buffer(Bcrypt.hashSync(this.password + now + this._id, 11)).toString('base64')).toString('base64')
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

          if (this.email != email) {
            return 'Wrong user or wrong email in the hash';
          }

          // verify hash
          if (!Bcrypt.compareSync(this.password + timestamp + this._id, hash)) {
            return 'This verification link has already been used';
          }
          return true
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
      // TODO: make sure email is valid
      email: {
        type: String,
        lowercase: true,
        trim: true,
        unique: true
      },
      email_verified: {
        type: Boolean,
        default: false
      },
      // TODO: make sure emails are valid
      emails: {
        type: Array
      },
      password: {
        type: String
      },
      // TODO: make sure only admins can set this
      verified: {
        type: Boolean,
        default: false
      },
      verified_by: {
        type: Schema.ObjectId,
        ref: 'User'
      },
      // TODO: make sure it's a valid URL
      picture: {
        type: String
      },
      notes: {
        type: String
      },
      // TODO: validate an array of VoIP objects
      voips: {
        type: Array
      },
      // TODO: validate urls
      websites: {
        type: Array
      },
      // TODO: validate timezone
      zoneinfo: {
        type: String
      },
      // TODO: validate locale
      locale: {
        type: String
      },
      // TODO :make sure it's a valid organization
      organization: {
        type: Schema.Types.Mixed
      },
      organizations: [ checkInSchema ],
      // TODO: verify valid phone number with libphonenumber and reformat if needed
      phone_number: {
        type: String
      },
      phone_number_type: {
        type: String,
        enum: ['Mobile', 'Landline'],
      },
      phone_numbers: {
        type: Array
      },
      job_title: {
        type: String
      },
      job_titles: {
        type: Array
      },
      // TODO: verify that roles belong to hrinfo functional roles
      roles: {
        type: Array
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
      // TODO: make sure only an admin can set this
      is_admin: {
        type: Boolean,
        default: false
      },
      is_orphan: {
        type: Boolean,
        default: false
      },
      is_ghost: {
        type: Boolean,
        default: false
      },
      createdBy: {
        type: Schema.ObjectId,
        ref: 'User'
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
