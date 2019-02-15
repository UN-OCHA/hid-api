'use strict';

const Nodemailer = require('nodemailer');
const Email = require('email-templates');
const TransporterUrl = 'smtp://' + process.env.SMTP_USER + ':' + process.env.SMTP_PASS + '@' + process.env.SMTP_HOST + ':' + process.env.SMTP_PORT;
const Transporter = Nodemailer.createTransport(TransporterUrl);

/**
 * @module EmailService
 * @description Service to send emails
 */
const _addUrlArgument = function (url, name, value) {
  let out = url;
  if (url.indexOf('?') !== -1) {
    out += '&' + name + '=' + value;
  }
  else {
    out += '?' + name + '=' + value;
  }
  return out;
};

const _addHash = function (url, hash) {
  return _addUrlArgument(url, 'hash', hash);
};

const send = function (options, template, context) {
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
  return email.send(args);
};

module.exports = {

  sendRegister: function (user, appVerifyUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    const hash = user.generateHash('verify_email', user.email);
    let resetUrl = _addUrlArgument(appVerifyUrl, 'email', user.email);
    resetUrl = _addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = _addHash(resetUrl, hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl
    };
    return send(mailOptions, 'register', context);
  },

  sendRegisterOrphan: function (user, admin, appVerifyUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = _addUrlArgument(appVerifyUrl, 'id', user._id.toString());
    resetUrl = _addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = _addHash(resetUrl, hash.hash);
    const context = {
      user: user,
      admin: admin,
      reset_url: resetUrl
    };
    return send(mailOptions, 'register_orphan', context);
  },

  sendRegisterKiosk: function (user, appVerifyUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en'
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = _addUrlArgument(appVerifyUrl, 'id', user._id.toString());
    resetUrl = _addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = _addHash(resetUrl, hash.hash);
    const context = {
      user: user,
      reset_url: resetUrl
    };
    return send(mailOptions, 'register_kiosk', context);
  },

  sendPostRegister: function (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      given_name: user.given_name,
      profile_url: process.env.APP_URL + '/users/' + user._id
    };
    return send(mailOptions, 'post_register', context);
  },

  sendResetPassword: function (user, appResetUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = _addUrlArgument(appResetUrl, 'id', user._id.toString());
    resetUrl = _addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = _addHash(resetUrl, hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl,
      appResetUrl: appResetUrl
    };
    return send(mailOptions, 'reset_password', context);
  },

  sendForcedPasswordReset: function (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    return send(mailOptions, 'forced_password_reset', context);
  },

  sendForcedPasswordResetAlert: function (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    return send(mailOptions, 'forced_password_reset_alert', context);
  },

  sendForcedPasswordResetAlert7: function (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    return send(mailOptions, 'forced_password_reset_alert7', context);
  },

  sendClaim: function (user, appResetUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = _addUrlArgument(appResetUrl, 'id', user._id.toString());
    resetUrl = _addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = _addHash(resetUrl, hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl,
    };
    return send(mailOptions, 'claim', context);
  },

  sendValidationEmail: function (user, email, appValidationUrl) {
    const mailOptions = {
      to: email,
      locale: user.locale
    };
    const hash = user.generateHash('verify_email', email);
    let resetUrl = _addUrlArgument(appValidationUrl, 'email', email);
    resetUrl = _addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = _addHash(resetUrl, hash.hash);
    const context = {
      user: user,
      reset_url: resetUrl
    };
    return send(mailOptions, 'email_validation', context);
  },

  sendNotification: function (not) {
    const mailOptions = {
      to: not.user.email,
      locale: not.user.locale
    };
    return send(mailOptions, not.type, not);
  },

  sendReminderVerify: function (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const hash = user.generateHash('verify_email', user.email);
    let resetUrl = _addUrlArgument(process.env.APP_URL, 'email', user.email);
    resetUrl = _addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = _addHash(resetUrl, hash.hash);
    const context = {
      user: user,
      verifyLink: resetUrl
    };
    return send(mailOptions, 'reminder_verify', context);
  },

  sendReminderUpdate: function (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user,
      userUrl: process.env.APP_URL + '/user/' + user._id
    };
    return send(mailOptions, 'reminder_update', context);
  },

  sendAuthToProfile: function (user, createdBy) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user,
      createdBy: createdBy
    };
    return send(mailOptions, 'auth_to_profile', context);
  },

  sendEmailAlert: function (user, emailSend, emailAdded) {
    const mailOptions = {
      to: emailSend,
      locale: user.locale
    };
    const context = {
      user: user,
      emailAdded: emailAdded
    };
    return send(mailOptions, 'email_alert', context);
  },

  sendSpecialPasswordReset: function (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    return send(mailOptions, 'special_password_reset', context);
  },

  sendVerificationExpiryEmail: function (user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale
    };
    const context = {
      user: user
    };
    return send(mailOptions, 'verification_expiry', context);
  }

};
