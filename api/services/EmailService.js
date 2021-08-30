/**
 * @module EmailService
 * @description Service to send emails
 */
const Nodemailer = require('nodemailer');
const Email = require('email-templates');
const config = require('../../config/env');

const { logger } = config;
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
  };
}

const Transporter = Nodemailer.createTransport(TransporterSettings);

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
    .then(() => {
      logger.info(
        `[EmailService->send] Sent ${tpl} email to ${options.to}`,
      );
    })
    .catch((err) => {
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
    const hash = user.generateHashEmail(user.email);
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
    const hash = user.generateHashPassword();
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

  sendResetPassword(user, emailToTarget) {
    const targetEmail = emailToTarget || user.email;
    const mailOptions = {
      to: targetEmail,
      locale: user.locale,
    };

    // Determine our internal email ID for the email receiving the reset.
    const emailIndex = user.emailIndex(targetEmail);
    const emailId = user.emails[emailIndex]._id.toString();

    // Prepare the password reset link args
    const hash = user.generateHashPassword(emailId);
    const baseUrl = `${process.env.APP_URL}/new-password`;

    // Build the reset link.
    let resetLink = addUrlArgument(baseUrl, 'id', user._id.toString());
    resetLink = addUrlArgument(resetLink, 'time', hash.timestamp);
    resetLink = addUrlArgument(resetLink, 'emailId', emailId);
    resetLink = addUrlArgument(resetLink, 'hash', hash.hash);

    // Email will allow user to restart process. Prep the URL.
    const passwordUrl = `${process.env.APP_URL}/password`;

    // Gather info for the email message.
    const context = {
      name: user.name,
      resetLink,
      passwordUrl,
    };

    // Send email.
    return send(mailOptions, 'reset_password', context);
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

  sendValidationEmail(user, emailToValidate, emailId) {
    // Prepare data for the email.
    const mailOptions = {
      to: emailToValidate,
      locale: user.locale,
    };

    // Assemble values for confirmation link.
    const baseUrl = `${process.env.APP_URL}/verify`;
    const hash = user.generateHashEmail(emailToValidate);

    // Build confirmation link.
    let resetUrl = addUrlArgument(baseUrl, 'id', user._id.toString());
    resetUrl = addUrlArgument(resetUrl, 'emailId', emailId);
    resetUrl = addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = addUrlArgument(resetUrl, 'hash', hash.hash);

    // Assemble email values.
    const context = {
      user,
      reset_url: resetUrl,
    };

    // Send email
    return send(mailOptions, 'email_validation', context);
  },

  sendNotification(not) {
    const mailOptions = {
      to: not.user.email,
      locale: not.user.locale,
    };
    return send(mailOptions, not.type, not);
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
