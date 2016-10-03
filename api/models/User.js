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
      methods: {
        validPassword: function (password)  {
          return Bcrypt.compareSync(password, this.password)
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
      list: Schema.ObjectId,
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
      organizations: {
        type: Array
      },
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
      favoriteLists: [{
        type: Schema.ObjectId,
        ref: 'List'
      }],
      checkins: [ checkInSchema ]
    };
  }

  static onSchema(schema) {
    schema.pre('save', function (next) {
      if (this.password) {
        this.password = Bcrypt.hashSync(this.password, 11);
      }
      if (this.middle_name) {
        this.name = this.given_name + ' ' + this.middle_name + ' ' + this.family_name
      }
      else {
        this.name = this.given_name + ' ' + this.family_name
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
