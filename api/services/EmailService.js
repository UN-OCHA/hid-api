const Nodemailer = require('nodemailer');
const Email = require('email-templates');

const TransporterSettings = {
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 25,
  secure: process.env.SMTP_TLS === 'true' || false,
};
// Only append `auth` property if we have both values to pass.
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  TransporterSettings.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
}

const Transporter = Nodemailer.createTransport(TransporterSettings);
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module EmailService
 * @description Service to send emails
 */
function addUrlArgument(url, name, value) {
  let out = url;
  if (url.indexOf('?') !== -1) {
    out += `&${name}=${value}`;
  } else {
    out += `?${name}=${value}`;
  }
  return out;
}

function addHash(url, hash) {
  return addUrlArgument(url, 'hash', hash);
}

function send(options, tpl, context) {
  let template = tpl;
  if (options.locale && options.locale === 'fr') {
    template += '/fr';
  }
  const email = new Email({
    views: {
      options: {
        extension: 'ejs',
      },
    },
    message: {
      from: 'info@humanitarian.id',
    },
    send: true,
    transport: Transporter,
  });
  const args = {
    template,
    message: options,
    locals: context,
  };

  return email.send(args)
    .then(res => {
      logger.info(
        `[EmailService->send] Sent ${tpl} email to ${options.to}`,
      );
    })
    .catch(err => {
      logger.warn(
        `[EmailService->send] Failed to send ${tpl} email to ${options.to}`,
        {
          fail: true,
          stack_trace: err.stack,
        },
      );
    });
}

module.exports = {

  sendRegister(user, appVerifyUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en',
    };
    const hash = user.generateHash('verify_email', user.email);
    let resetUrl = addUrlArgument(appVerifyUrl, 'id', user._id.toString());
    resetUrl = addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = addHash(resetUrl, hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl,
    };
    return send(mailOptions, 'register', context);
  },

  sendRegisterKiosk(user, appVerifyUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en',
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = addUrlArgument(appVerifyUrl, 'id', user._id.toString());
    resetUrl = addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = addHash(resetUrl, hash.hash);
    const context = {
      user,
      reset_url: resetUrl,
    };
    return send(mailOptions, 'register_kiosk', context);
  },

  sendPostRegister(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      given_name: user.given_name,
      profile_url: `${process.env.APP_URL}/users/${user._id}`,
    };
    return send(mailOptions, 'post_register', context);
  },

  sendResetPassword(user, appResetUrl, targetEmail = '') {
    if (!targetEmail) {
      targetEmail = user.email;
    }
    const mailOptions = {
      to: targetEmail,
      locale: user.locale,
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = addUrlArgument(appResetUrl, 'id', user._id.toString());
    resetUrl = addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = addHash(resetUrl, hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl,
      appResetUrl,
    };
    return send(mailOptions, 'reset_password', context);
  },

  sendDecommissionForAuthUsers(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      user: {
        name: user.name,
      },
    };
    logger.info(`[EmailService->sendDecommissionForAuthUsers]`, context);
    return send(mailOptions, 'decommission_auth', context);
  },

  sendDecommissionForProfileUsers(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      user: {
        name: user.name,
      },
    };
    logger.info(`[EmailService->sendDecommissionForProfileUsers]`, context);
    return send(mailOptions, 'decommission_profile', context);
  },

  sendForcedPasswordReset(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      user,
    };
    return send(mailOptions, 'forced_password_reset', context);
  },

  sendForcedPasswordResetAlert(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      user,
    };
    return send(mailOptions, 'forced_password_reset_alert', context);
  },

  sendForcedPasswordResetAlert7(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      user,
    };
    return send(mailOptions, 'forced_password_reset_alert7', context);
  },

  sendClaim(user, appResetUrl) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const hash = user.generateHash('reset_password');
    let resetUrl = addUrlArgument(appResetUrl, 'id', user._id.toString());
    resetUrl = addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = addHash(resetUrl, hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl,
    };
    return send(mailOptions, 'claim', context);
  },

  sendValidationEmail(user, email, emailId, appValidationUrl) {
    const mailOptions = {
      to: email,
      locale: user.locale,
    };
    const hash = user.generateHash('verify_email', email);
    let resetUrl = addUrlArgument(appValidationUrl, 'id', user._id.toString());
    resetUrl = addUrlArgument(resetUrl, 'emailId', emailId);
    resetUrl = addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = addHash(resetUrl, hash.hash);
    const context = {
      user,
      reset_url: resetUrl,
    };
    return send(mailOptions, 'email_validation', context);
  },

  sendNotification(not) {
    const mailOptions = {
      to: not.user.email,
      locale: not.user.locale,
    };
    return send(mailOptions, not.type, not);
  },

  sendAuthToProfile(user, createdBy) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      user,
      createdBy,
    };
    return send(mailOptions, 'auth_to_profile', context);
  },

  sendEmailAlert(user, emailSend, emailAdded) {
    const mailOptions = {
      to: emailSend,
      locale: user.locale,
    };
    const context = {
      user,
      emailAdded,
    };
    return send(mailOptions, 'email_alert', context);
  },

  sendSpecialPasswordReset(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      user,
    };
    return send(mailOptions, 'special_password_reset', context);
  },

  sendAdminDelete(user, admin) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      user,
      admin,
    };
    return send(mailOptions, 'admin_delete', context);
  },

};
