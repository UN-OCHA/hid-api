'use strict';

const Service = require('trails/service');
const Nodemailer = require('nodemailer');
const Email = require('email-templates');
const TransporterUrl = 'smtp://' + process.env.SMTP_USER + ':' + process.env.SMTP_PASS + '@' + process.env.SMTP_HOST + ':' + process.env.SMTP_PORT;
const Transporter = Nodemailer.createTransport(TransporterUrl);

/**
 * @module EmailService
 * @description Service to send emails
 */
module.exports = class EmailService extends Service {

  _addUrlArgument (url, name, value) {
    let out = url;
    if (url.indexOf('?') !== -1) {
      out += '&' + name + '=' + value;
    }
    else {
      out += '?' + name + '=' + value;
    }
    return out;
  }

  // Helper function to add hash to a link
  _addHash(url, hash) {
    return this._addUrlArgument(url, 'hash', hash);
  }

  // Send an email
  send (options, template, context, callback) {
    if (options.locale && options.locale === 'fr') {
      template = template + '/fr';
    }
    const email = new Email({
      views: {
        options: {
          extension: 'ejs'
        }
      },
      message: {
        from: 'info@humanitarian.id'
      },
      send: true,
      transport: Transporter
    });
    const args = {
      template: template,
      message: options,
      locals: context
    };
    if (callback) {
      email.send(args)
        .then(() => {
          return callback();
        })
        .catch(err => {
          return callback(err);
        });
    }
    else {
      return email.send(args);
    }
  }

  sendRegister (user, appVerifyUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };

    const hash = user.generateHash();
    const that = this;
    user.hash = hash;
    user.hashAction = 'verify_email';
    user.hashEmail = user.email;
    return user
      .save()
      .then(() => {
        const resetUrl = that._addHash(appVerifyUrl, hash);
        const context = {
          name: user.name,
          reset_url: resetUrl
        };
        return that.send(mailOptions, 'register', context);
      });
  }

  sendRegisterOrphan(user, admin, appVerifyUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = this._addUrlArgument(appVerifyUrl, 'id', user._id.toString());
    resetUrl = this._addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = this._addHash(resetUrl, hash.hash);
    const context = {
      user: user,
      admin: admin,
      reset_url: resetUrl
    };
    return this.send(mailOptions, 'register_orphan', context);
  }

  sendRegisterKiosk(user, appVerifyUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = this._addUrlArgument(appVerifyUrl, 'id', user._id.toString());
    resetUrl = this._addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = this._addHash(resetUrl, hash.hash);
    const context = {
      user: user,
      reset_url: resetUrl
    };
    return this.send(mailOptions, 'register_kiosk', context);
  }

  sendPostRegister (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      given_name: user.given_name,
      profile_url: process.env.APP_URL + '/users/' + user._id
    };
    return this.send(mailOptions, 'post_register', context);
  }

  sendResetPassword (user, appResetUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = this._addUrlArgument(appResetUrl, 'id', user._id.toString());
    resetUrl = this._addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = this._addHash(resetUrl, hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl,
      appResetUrl: appResetUrl
    };
    return this.send(mailOptions, 'reset_password', context);
  }

  sendForcedPasswordReset (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    this.send(mailOptions, 'forced_password_reset', context, callback);
  }

  sendForcedPasswordResetAlert (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    this.send(mailOptions, 'forced_password_reset_alert', context, callback);
  }

  sendForcedPasswordResetAlert7 (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    this.send(mailOptions, 'forced_password_reset_alert7', context, callback);
  }

  sendClaim (user, appResetUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = this._addUrlArgument(appResetUrl, 'id', user._id.toString());
    resetUrl = this._addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = this._addHash(resetUrl, hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl,
    };
    return this.send(mailOptions, 'claim', context);
  }

  sendValidationEmail (user, email, appValidationUrl) {
    const mailOptions = {
      to: email,
      locale: user.locale
    };
    const hash = user.generateHash();
    const that = this;
    user.hash = hash;
    user.hashAction = 'verify_email';
    user.hashEmail = email;
    return user
      .save()
      .then(() => {
        const resetUrl = that._addHash(appValidationUrl, hash);
        const context = {
          user: user,
          reset_url: resetUrl
        };
        return that.send(mailOptions, 'email_validation', context);
      });
  }

  sendNotification(not) {
    const mailOptions = {
      to: not.user.email,
      locale: not.user.locale
    };
    return this.send(mailOptions, not.type, not);
  }

  sendReminderVerify (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const hash = user.generateHash();
    const that = this;
    user.hash = hash;
    user.hashAction = 'verify_email';
    user.hashEmail = user.email;
    user
      .save()
      .then(() => {
        const context = {
          user: user,
          verifyLink: this._addHash(process.env.APP_URL, hash)
        };
        that.send(mailOptions, 'reminder_verify', context, callback);
      })
      .catch(err => {
        callback(err);
      });
  }

  sendReminderUpdate (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user,
      userUrl: process.env.APP_URL + '/user/' + user._id
    };
    this.send(mailOptions, 'reminder_update', context, callback);
  }

  sendAuthToProfile (user, createdBy, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user,
      createdBy: createdBy
    };
    this.send(mailOptions, 'auth_to_profile', context, callback);
  }

  sendEmailAlert (user, emailSend, emailAdded, callback) {
    const mailOptions = {
      to: emailSend,
      locale: user.locale
    };
    const context = {
      user: user,
      emailAdded: emailAdded
    };
    this.send(mailOptions, 'email_alert', context, callback);
  }

  sendSpecialPasswordReset (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    this.send(mailOptions, 'special_password_reset', context, callback);
  }

  sendVerificationExpiryEmail (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    this.send(mailOptions, 'verification_expiry', context, callback);
  }

};
