/**
 * @module EmailService
 * @description Service to send emails
 */
const aws = require('@aws-sdk/client-ses');
const Nodemailer = require('nodemailer');
const Email = require('email-templates');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { getDefaultRoleAssumerWithWebIdentity } = require('@aws-sdk/client-sts');
const config = require('../../config/env');

const { logger } = config;

if (process.env.AWS_ROLE_ARN) {
  const provider = defaultProvider({
    roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity({
      roleArn: process.env.AWS_ROLE_ARN,
      region: process.env.AWS_REGION || "us-east-1",
    }),
  });

  const ses = new aws.SES({
    apiVersion: "2010-12-01",
    region: process.env.AWS_REGION || "us-east-1",
    credentialDefaultProvider: provider,
  });

  const TransporterSettings = {
     SES: { ses, aws },
  };
} else {
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

  sendRegister(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale || 'en',
    };
    const hash = user.generateHashEmail(user.email);
    const baseUrl = `${process.env.APP_URL}/verify`;
    let resetUrl = addUrlArgument(baseUrl, 'id', user._id.toString());
    resetUrl = addUrlArgument(resetUrl, 'time', hash.timestamp);
    resetUrl = addUrlArgument(resetUrl, 'hash', hash.hash);
    const context = {
      name: user.name,
      reset_url: resetUrl,
    };
    return send(mailOptions, 'register', context);
  },

  sendPostRegister(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const context = {
      given_name: user.given_name,
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

  sendAdminDelete(user, admin) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const registerLink = `${process.env.APP_URL}/register`;
    const context = {
      user,
      admin,
      registerLink,
    };
    return send(mailOptions, 'admin_delete', context);
  },

  sendAutoExpire(user) {
    const mailOptions = {
      to: user.email,
      locale: user.locale,
    };
    const registerLink = `${process.env.APP_URL}/register`;
    const context = {
      user,
      registerLink,
    };
    return send(mailOptions, 'auto_expire', context);
  },
};
