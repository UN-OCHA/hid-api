'use strict';

const Service = require('trails/service');
const Nodemailer = require('nodemailer');
const EmailTemplate = require('email-templates').EmailTemplate;
const TemplateDir = require('path').join(__dirname, '../../emails/');
const TransporterUrl = 'smtp://' + process.env.SMTP_USER + ':' + process.env.SMTP_PASS + '@' + process.env.SMTP_HOST + ':' + process.env.SMTP_PORT;
const Transporter = Nodemailer.createTransport(TransporterUrl);

/**
 * @module EmailService
 * @description Service to send emails
 */
module.exports = class EmailService extends Service {

  // Helper function to add hash to a link
  _addHash(url, hash) {
    let out = url;
    if (url.indexOf('?') !== -1) {
      out += '&hash=' + hash;
    }
    else {
      out += '?hash=' + hash;
    }
    return out;
  }

  // Send an email
  send (options, template, context, callback) {
    let templateDir = TemplateDir + template;
    if (options.locale && options.locale !== 'en') {
      templateDir += '/' + options.locale;
    }
    const templateSender = Transporter.templateSender(new EmailTemplate(templateDir), {
      from: 'info@humanitarian.id'
    });
    if (options.to) {
      templateSender(options, context, callback);
    }
    else {
      callback();
    }
  }

  sendRegister (user, appVerifyUrl, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    const resetUrl = this._addHash(appVerifyUrl, user.generateHash(user.email));
    const context = {
      name: user.name,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'register', context, callback);
  }

  sendRegisterOrphan(user, admin, appVerifyUrl, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    const resetUrl = this._addHash(appVerifyUrl, user.generateHash(user.email));
    const context = {
      user: user,
      admin: admin,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'register_orphan', context, callback);
  }

  sendRegisterKiosk(user, appVerifyUrl, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    const resetUrl = this._addHash(appVerifyUrl, user.generateHash(user.email));
    const context = {
      user: user,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'register_kiosk', context, callback);
  }

  sendPostRegister (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      given_name: user.given_name,
      profile_url: process.env.APP_URL + '/users/' + user._id
    };
    this.send(mailOptions, 'post_register', context, callback);
  }

  sendResetPassword (user, appResetUrl, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const hash = user.generateHash();
    const that = this;
    user.hash = hash;
    user.hashAction = 'reset_password';
    user
      .save()
      .then(() => {
        const resetUrl = that._addHash(appResetUrl, hash);
        const context = {
          name: user.name,
          reset_url: resetUrl
        };
        that.send(mailOptions, 'reset_password', context, callback);
      })
      .catch(err => {
        callback(err);
      });
  }

  sendClaim (user, appResetUrl, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const resetUrl = this._addHash(appResetUrl, user.generateHash(user.email));
    const context = {
      name: user.name,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'claim', context, callback);
  }

  sendValidationEmail (user, email, appValidationUrl, callback) {
    const mailOptions = {
      to: email,
      locale: user.locale
    };
    const resetUrl = this._addHash(appValidationUrl, user.generateHash(email));
    const context = {
      user: user,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'email_validation', context, callback);
  }

  sendNotification(not, cb) {
    const mailOptions = {
      to: not.user.email,
      locale: not.user.locale
    };
    this.send(mailOptions, not.type, not, cb);
  }

  sendReminderVerify (user, callback) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user,
      verifyLink: this._addHash(process.env.APP_URL, user.generateHash(user.email))
    };
    this.send(mailOptions, 'reminder_verify', context, callback);
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

};
