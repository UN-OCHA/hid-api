'use strict'

const Service = require('trails-service')
const Nodemailer = require('nodemailer')
const EmailTemplate = require('email-templates').EmailTemplate;
const TemplateDir = require('path').join(__dirname, '../../emails/')
const Transporter = Nodemailer.createTransport('smtp://' + process.env.SMTP_USER + ':' + process.env.SMTP_PASS + '@' + process.env.SMTP_HOST + ':' + process.env.SMTP_PORT)

/**
 * @module EmailService
 * @description Service to send emails
 */
module.exports = class EmailService extends Service {

  // Helper function to add hash to a link
  _addHash(url, hash) {
    var out = url
    if (url.indexOf('?') != -1) {
      out += '&hash=' + hash
    }
    else {
      out += '?hash=' + hash
    }
    return out
  }

  // Send an email
  send (options, template, context, callback) {
    var templateDir = TemplateDir + template
    if (options.locale && options.locale != 'en') templateDir += '/' + options.locale
    var templateSender = Transporter.templateSender(new EmailTemplate(templateDir), {
      from: 'info@humanitarian.id'
    });
    templateSender(options, context, callback);
  }

  sendRegister (user, app_verify_url, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    var reset_url = this._addHash(app_verify_url, user.generateHash(user.email))
    var context = {
      name: user.name,
      reset_url: reset_url
    };
    this.send(mailOptions, 'register', context, callback);
  }

  sendRegisterOrphan(user, admin, app_verify_url, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    var reset_url = this._addHash(app_verify_url, user.generateHash(user.email))
    var context = {
      user: user,
      admin: admin,
      reset_url: reset_url
    };
    this.send(mailOptions, 'register_orphan', context, callback);
  }

  sendRegisterKiosk(user, app_verify_url, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    var reset_url = this._addHash(app_verify_url, user.generateHash(user.email))
    var context = {
      user: user,
      reset_url: reset_url
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

  sendResetPassword (user, app_reset_url, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale
    };
    var reset_url = this._addHash(app_reset_url, user.generateHash(user.email))
    var context = {
      name: user.name,
      reset_url: reset_url
    };
    this.send(mailOptions, 'reset_password', context, callback);
  }

  sendClaim (user, app_reset_url, callback) {
    var mailOptions = {
      to: user.email,
      locale: user.locale
    };
    var reset_url = this._addHash(app_reset_url, user.generateHash(user.email))
    var context = {
      name: user.name,
      reset_url: reset_url
    };
    this.send(mailOptions, 'claim', context, callback);
  }

  sendValidationEmail (user, email, app_validation_url, callback) {
    var mailOptions = {
      to: email,
      locale: user.locale
    };
    var reset_url = this._addHash(app_validation_url, user.generateHash(email))
    var context = {
      user: user,
      reset_url: reset_url
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

}

