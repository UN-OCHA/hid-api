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
    var out = url;
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
    var templateDir = TemplateDir + template;
    if (options.locale && options.locale !== 'en') {
      templateDir += '/' + options.locale;
    }
    var templateSender = Transporter.templateSender(new EmailTemplate(templateDir), {
      from: 'info@humanitarian.id'
    });
    templateSender(options, context, callback);
  }

  sendRegister (user, appVerifyUrl, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    var resetUrl = this._addHash(appVerifyUrl, user.generateHash(user.email));
    var context = {
      name: user.name,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'register', context, callback);
  }

  sendRegisterOrphan(user, admin, appVerifyUrl, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    var resetUrl = this._addHash(appVerifyUrl, user.generateHash(user.email));
    var context = {
      user: user,
      admin: admin,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'register_orphan', context, callback);
  }

  sendRegisterKiosk(user, appVerifyUrl, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    var resetUrl = this._addHash(appVerifyUrl, user.generateHash(user.email));
    var context = {
      user: user,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'register_kiosk', context, callback);
  }

  sendPostRegister (user, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale
    };
    var context = {
      given_name: user.given_name,
      profile_url: process.env.APP_URL + '/users/' + user._id
    };
    this.send(mailOptions, 'post_register', context, callback);
  }

  sendResetPassword (user, appResetUrl, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale
    };
    var resetUrl = this._addHash(appResetUrl, user.generateHash(user.email));
    var context = {
      name: user.name,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'reset_password', context, callback);
  }

  sendClaim (user, appResetUrl, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale
    };
    var resetUrl = this._addHash(appResetUrl, user.generateHash(user.email));
    var context = {
      name: user.name,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'claim', context, callback);
  }

  sendValidationEmail (user, email, appValidationUrl, callback) {
    var mailOptions = {
      to: email,
      locale: user.locale
    };
    var resetUrl = this._addHash(appValidationUrl, user.generateHash(email));
    var context = {
      user: user,
      reset_url: resetUrl
    };
    this.send(mailOptions, 'email_validation', context, callback);
  }

  sendNotification(not, cb) {
    var mailOptions = {
      to: not.user.email,
      locale: not.user.locale
    };
    this.send(mailOptions, not.type, not, cb);
  }

  sendReminderVerify (user, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale
    };
    var context = {
      user: user,
      verifyLink: this._addHash(process.env.APP_URL, user.generateHash(user.email))
    };
    this.send(mailOptions, 'reminder_verify', context, callback);
  }

  sendReminderUpdate (user, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale
    };
    var context = {
      user: user,
      userUrl: process.env.APP_URL + '/user/' + user._id
    };
    this.send(mailOptions, 'reminder_update', context, callback);
  }

};
