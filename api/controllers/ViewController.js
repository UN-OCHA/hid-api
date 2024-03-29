/**
 * @module ViewController
 * @description Controller for pages that visitors see.
 */
const Boom = require('@hapi/boom');
const Hoek = require('@hapi/hoek');
const Recaptcha = require('recaptcha2');
const Client = require('../models/Client');
const User = require('../models/User');
const EmailService = require('../services/EmailService');
const HelperService = require('../services/HelperService');
const TOTPController = require('./TOTPController');
const UserController = require('./UserController');
const AuthPolicy = require('../policies/AuthPolicy');
const config = require('../../config/env');

const { logger } = config;

function _getRegisterLink(args) {
  const params = HelperService.getOauthParams(args);
  let registerLink = '/register';
  if (params) {
    registerLink += `?${params}`;
  }
  return registerLink;
}

function _getPasswordLink(args) {
  const params = HelperService.getOauthParams(args);
  let registerLink = '/password';
  if (params) {
    registerLink += `?${params}`;
  }
  return registerLink;
}

function _buildRequestUrl(request, url) {
  const protocol = process.env.NODE_ENV === 'local' ? 'http' : 'https';
  let requestUrl = `${protocol}://${request.info.host}/${url}`;

  if (request.query.client_id) {
    requestUrl += `?client_id=${request.query.client_id}`;
  }
  if (request.query.redirect_uri) {
    requestUrl += `&redirect_uri=${request.query.redirect_uri}`;
  }
  if (request.query.response_type) {
    requestUrl += `&response_type=${request.query.response_type}`;
  }
  if (request.query.scope) {
    requestUrl += `&scope=${request.query.scope}`;
  }
  return requestUrl;
}

module.exports = {

  async login(request, reply) {
    const cookie = request.yar.get('session');

    // User is already logged in.
    if (cookie && cookie.userId && cookie.totp === true) {
      // Check that all required params for OAuth seem intact. If we find all of
      // these params, assume the user is logging into another website with HID.
      if (
        request.query.client_id
        && request.query.redirect_uri
        && request.query.response_type
        && request.query.scope
      ) {
        // Redirect to /oauth/authorize
        let redirect = request.query.redirect || '/oauth/authorize';
        redirect += `?client_id=${request.query.client_id}`;
        redirect += `&redirect_uri=${request.query.redirect_uri}`;
        redirect += `&response_type=${request.query.response_type}`;
        redirect += `&scope=${request.query.scope}`;
        if (request.query.state) {
          redirect += `&state=${request.query.state}`;
        }

        logger.info(
          '[ViewController->login] User has a session. Redirecting to OAuth screen.',
          {
            request,
          },
        );

        return reply.redirect(redirect);
      }

      logger.info(
        '[ViewController->login] User has a session. Redirecting to dashboard.',
        {
          request,
        },
      );

      // It seems like the user navigated to HID themselves and is just logging
      // in by their own choice. Show user dashboard.
      return reply.redirect('/user');
    }

    // User is logged in, but TOTP challenge is not answered yet.
    if (cookie && cookie.userId && cookie.totp === false) {
      logger.info(
        '[ViewController->login] Displaying TOTP prompt.',
        {
          request,
        },
      );

      // Show TOTP form
      return reply.view('totp', {
        title: 'Enter your Authentication code',
        query: request.query,
        destination: '/login',
        alert: false,
      });
    }

    // Show the login form
    const registerLink = _getRegisterLink(request.query);
    const passwordLink = _getPasswordLink(request.query);
    const loginArgs = {
      title: 'Log into Humanitarian ID',
      query: request.query,
      registerLink,
      passwordLink,
      alert: cookie && cookie.alert,
    };

    // Remove alert from cookie now that it's been queued to display.
    if (cookie) {
      delete cookie.alert;
      request.yar.set(cookie);
    }

    logger.info(
      '[ViewController->login] Displaying login page.',
      {
        request,
      },
    );

    // Display login page.
    return reply.view('login', loginArgs);
  },

  async logout(request, reply) {
    // Temporarily store user session for logging purposes.
    const oldCookie = Hoek.clone(request.yar.get('session'));

    // Destroy user session.
    request.yar.reset();

    // Determine whether to redirect the user elsewhere besides HID homepage.
    if (request.query.redirect) {
      // Validate redirect URL
      const url = request.query.redirect;
      const urlArray = url.split('/');
      let hostname;
      if (url.indexOf('://') > -1) {
        [, , hostname] = urlArray;
      } else {
        [hostname] = urlArray;
      }
      // find & remove port number
      [hostname] = hostname.split(':');
      // find & remove "?"
      [hostname] = hostname.split('?');
      const regex = new RegExp(hostname, 'i');
      try {
        const count = await Client.countDocuments({ redirectUri: regex });
        if (count > 0) {
          logger.info(
            `[ViewController->logout] Logging user out and redirecting to destination: ${url}`,
            {
              request,
              user: {
                id: oldCookie && oldCookie.userId,
              },
            },
          );

          return reply.redirect(request.query.redirect);
        }
        logger.warn(`Redirecting to ${request.query.redirect} is not allowed`, { security: true, fail: true, request });
        return reply.redirect('/');
      } catch (err) {
        logger.error(
          '[ViewController->logout] Error logging user out.',
          {
            request,
            security: true,
            fail: true,
            error: err.message,
            err_object: err,
            stack_trace: err.stack,
          },
        );
        return reply.redirect('/');
      }
    }

    logger.info(
      '[ViewController->logout] Logging user out.',
      {
        request,
        user: {
          id: oldCookie && oldCookie.userId,
        },
      },
    );

    return reply.redirect('/');
  },

  register(request, reply) {
    const requestUrl = _buildRequestUrl(request, 'verify');
    return reply.view('register', {
      title: 'Register a Humanitarian ID account',
      formEmail: '',
      formGivenName: '',
      formFamilyName: '',
      requestUrl,
      recaptcha_site_key: process.env.RECAPTCHA_PUBLIC_KEY,
    });
  },

  async registerPost(request, reply) {
    // Check recaptcha
    const recaptcha = new Recaptcha({
      siteKey: process.env.RECAPTCHA_PUBLIC_KEY,
      secretKey: process.env.RECAPTCHA_PRIVATE_KEY,
    });
    const registerLink = _getRegisterLink(request.payload);
    const passwordLink = _getPasswordLink(request.payload);
    let requestUrl = _buildRequestUrl(request, 'verify');

    // Validate the visitor's response to reCAPTCHA challenge.
    try {
      await recaptcha.validate(request.payload['g-recaptcha-response']);
    } catch (err) {
      const errorType = 'RECAPTCHA';

      logger.warn(
        '[ViewController->registerPost] Failure during reCAPTCHA validation.',
        {
          request,
          security: true,
          fail: true,
          stack_trace: err.stack,
          error_type: errorType,
        },
      );

      return reply.view('register', {
        alert: {
          type: 'error',
          message: `
            <p>Our system detected your registration attempt as spam. We apologize for the inconvenience.</p>
            <p>For more information on why this problem may be occurring, <a href="https://about.humanitarian.id/faqs">please see our FAQs</a></p>
          `,
          error_type: errorType,
        },
        formEmail: request.payload.email,
        formGivenName: request.payload.given_name,
        formFamilyName: request.payload.family_name,
        query: request.query,
        registerLink,
        passwordLink,
        requestUrl,
        recaptcha_site_key: process.env.RECAPTCHA_PUBLIC_KEY,
      });
    }

    // reCAPTCHA validation was successful. Proceed.
    try {
      // Attempt to create a new HID account.
      await UserController.create(request);

      // Render login form with success message.
      return reply.view('login', {
        alert: {
          type: 'status',
          message: 'Thank you for creating an account. You will soon receive a confirmation email to confirm your account.',
        },
        query: request.query,
        registerLink,
        passwordLink,
      });
    } catch (err) {
      // Check if we have an error worth telling the user about.
      const errorMessage = err.output && err.output.payload && err.output.payload.message;
      let userMessage = 'There is an error in your registration. You may have already registered. If so, simply reset your password at https://auth.humanitarian.id/password.';

      // If the error says the email already exists, we'll redirect to login.
      if (errorMessage && errorMessage.indexOf('is already registered') !== -1) {
        userMessage = 'That email address is already registered. Please login, or if you\'ve forgotten your password, reset using the link below.';

        return reply.view('login', {
          alert: {
            type: 'error',
            message: userMessage,
          },
          query: request.query,
          registerLink,
          passwordLink,
        });
      }

      // Check the error for a few special cases to provide better user feedback.
      // All of these will render the registration form.
      if (errorMessage && errorMessage.indexOf('password does not meet') !== -1) {
        userMessage = 'Your password was not strong enough. Please check the requirements and try again.';
      }
      if (errorMessage && errorMessage.indexOf('fields do not match') !== -1) {
        userMessage = 'Your password fields did not match. Please try again and carefully confirm the password.';
      }

      // Add a domain from the allow-list.
      requestUrl = _buildRequestUrl(request, 'register');

      // Render registration form.
      return reply.view('register', {
        alert: {
          type: 'warning',
          message: userMessage,
        },
        query: request.query,
        formEmail: request.payload.email,
        formGivenName: request.payload.given_name,
        formFamilyName: request.payload.family_name,
        requestUrl,
        recaptcha_site_key: process.env.RECAPTCHA_PUBLIC_KEY,
      });
    }
  },

  async verify(request, reply) {
    // The user might be logged in. Read their browser session.
    const cookie = request.yar.get('session');

    // If they aren't logged in, we'll still be showing them an alert and we
    // need a blank object so we can store the alert between page loads.
    const newSession = {};

    // Template variables.
    const registerLink = _getRegisterLink(request.query);
    const passwordLink = _getPasswordLink(request.query);

    try {
      // Do we have what we need to validate the confirmation link?
      if (!request.query.hash || !request.query.id || !request.query.time) {
        throw Boom.badRequest('Confirmation link was missing parameters.');
      }

      // Populate payload object.
      request.payload = {
        hash: request.query.hash,
        id: request.query.id,
        time: request.query.time,
        emailId: request.query.emailId || '',
      };

      // Validate the email address.
      await UserController.validateEmailAddress(request, reply);

      // If user is logged in, send them to their profile.
      if (cookie && cookie.userId) {
        cookie.alert = {
          type: 'status',
          message: 'Thank you for confirming your email address. It can now be set as your primary email if you wish.',
        };
        request.yar.set('session', cookie);

        return reply.redirect('/profile/edit');
      }

      // Now, redirect to homepage with cookied alert, to avoid resubmissions
      // if the user refreshes their browser.
      newSession.alert = {
        type: 'status',
        message: 'Thank you for confirming your account. You can now log in',
      };
      request.yar.set('session', newSession);

      return reply.redirect('/');
    } catch (err) {
      // Log our error.
      logger.error(
        `[ViewController->verify] ${err.message}`,
        {
          request,
          fail: true,
          stack_trace: err.stack,
        },
      );

      // Display nicely-formatted error to user.
      return reply.view('error', {
        alert: {
          type: 'error',
          message: `
            <p>There was an internal error because the confirmation link was not well-formed.</p>
            <p>Please try again, and if the problem persists contact info@humanitarian.id</p>
          `,
        },
        query: request.query,
        registerLink,
        passwordLink,
      });
    }
  },

  password(request, reply) {
    const requestUrl = _buildRequestUrl(request, 'new-password');
    return reply.view('password', {
      requestUrl,
    });
  },

  async passwordPost(request, reply) {
    const requestUrl = _buildRequestUrl(request, 'new-password');
    try {
      await UserController.resetPasswordEmail(request, reply);
      return reply.view('password', {
        alert: {
          type: 'status',
          message: `The request to change your password has been received. If ${request.payload.email} exists in our system you will receive a link to reset your password. You may need to check your spam folder if the email does not arrive.`,
        },
        query: request.query,
        requestUrl,
      });
    } catch (err) {
      logger.warn(
        `[Viewcontroller->passwordPost] ${err.message}`,
        {
          request,
          security: true,
          fail: true,
          stack_trace: err.stack,
        },
      );

      return reply.view('password', {
        alert: {
          type: 'error',
          message: 'There was an error generating the email to reset your password. Please try again.',
        },
        query: request.query,
        requestUrl,
      });
    }
  },

  async newPassword(request, reply) {
    // Destroy any existing user session
    request.yar.reset();

    // Store the contents of the reset link from the email message. We set the
    // `totp` flag to false and will flip it later in this function if the user
    // doesn't need to pass the challenge.
    const session = {
      hash: request.query.hash,
      id: request.query.id,
      time: request.query.time,
      emailId: request.query.emailId || '',
      totp: false,
    };
    request.yar.set('session', session);

    // Look up User by ID.
    const user = await User.findById(request.query.id).catch((err) => {
      logger.error(
        `[ViewController->newPassword] ${err.message}`,
        {
          request,
          fail: true,
          stack_trace: err.stack,
        },
      );
    });

    // Show error if we couldn't find a User.
    if (!user) {
      return reply.view('error', {
        alert: {
          type: 'error',
          title: 'Your password reset link is either invalid or expired.',
          message: `
            <p>Please <a href="/password">generate a new link</a> and try again. If you see this error multiple times, contact <a href="mailto:info@humanitarian.id">info@humanitarian.id</a> and include the following information:</p>
          `,
          error_type: 'PW-RESET-USER',
        },
      });
    }

    // Before continuing, check that password link is valid. No sense in making
    // the user do anthing if the link expired.
    if (user.validHashPassword(request.query.hash, request.query.time, request.query.emailId) === false) {
      return reply.view('error', {
        alert: {
          type: 'error',
          title: 'Your password reset link is either invalid or expired.',
          message: `
            <p>Password reset links are one-time links and remain valid for 24 hours or until used once.</p>
            <p>Go to <a href="/password">https://auth.humanitarian.id/password</a> and request a new password reset.</p>
          `,
          error_type: 'PW-RESET-LINK',
        },
      });
    }

    // User has 2FA enabled. They need to enter a TOTP before they continue.
    if (user.totp) {
      return reply.view('totp', {
        query: request.query,
        destination: '/new-password',
        alert: {
          type: 'warning',
          title: 'Enter your two-factor authentication code.',
          message: `
            <p><a href="https://about.humanitarian.id/faqs#2fa" target="_blank" rel="noopener noreferrer">Read about 2FA in our FAQs</a></p>
          `,
        },
      });
    }

    // If user didn't have 2FA enabled, set `totp` to true.
    session.totp = true;
    request.yar.set('session', session);

    // Display the password reset form.
    return reply.view('new-password', {
      query: request.query,
      hash: request.query.hash,
      id: request.query.id,
      emailId: request.query.emailId || '',
      time: request.query.time,
    });
  },

  async newPasswordPost(request, reply) {
    const cookie = request.yar.get('session');

    // Show 2FA prompt if necessary.
    if (cookie && cookie.hash && cookie.id && cookie.emailId && cookie.time && !cookie.totp) {
      try {
        const user = await User.findById(cookie.id);
        const token = request.payload['x-hid-totp'];

        // See if TOTP code is valid.
        await AuthPolicy.isTOTPValid(user, token);

        // It is valid and they're allowed to use the password reset form.
        // Set TOTP to true and reload this page to offer the password form.
        cookie.totp = true;
        request.yar.set('session', cookie);

        return reply.view('new-password', {
          query: request.payload,
          hash: cookie.hash,
          id: cookie.id,
          emailId: cookie.emailId,
          time: cookie.time,
        });
      } catch (err) {
        const alert = {
          type: 'error',
          message: err.output.payload.message,
        };
        return reply.view('totp', {
          query: request.payload,
          destination: '/new-password',
          alert,
        });
      }
    }

    // All users arrive here after passing 2FA (or if it is not enabled)
    if (cookie && cookie.hash && cookie.totp) {
      const registerLink = _getRegisterLink(request.payload);
      const passwordLink = _getPasswordLink(request.payload);

      try {
        // Now attempt the password reset.
        await UserController.resetPassword(request, reply);

        // If reset was successful, we want to cleanup the session storage and
        // give them a fresh session ID.
        request.yar.reset('session');

        // Show the login form with the success message.
        return reply.view('login', {
          alert: {
            type: 'status',
            message: 'Your password was successfully reset. You can now login.',
          },
          query: request.payload,
          registerLink,
          passwordLink,
        });
      } catch (err) {
        logger.warn(
          `[ViewController->newPasswordPost] ${err.message}`,
          {
            request,
            security: true,
            fail: true,
            stack_trace: err.stack,
          },
        );

        let userFacingMessage = '<p>There was an error resetting your password. Please try again.</p>';
        let userFacingError = 'PW-RESET-GENERAL';

        // Look at the nature of the error and show user feedback.
        if (err.message === 'Could not reset password') {
          userFacingMessage = '<p>The password did not meet our guidelines. Please try again.</p>';
          userFacingError = 'PW-RESET-INVALID';
        }

        // If fields didn't match, it's safe to disclose plus our user feedback
        // is clear enough that we probably don't need to show an error code.
        if (err.message === 'The password and password-confirmation fields did not match.') {
          userFacingMessage = `<p>${err.message}</p>`;
          userFacingError = undefined;
        }

        const requestUrl = _buildRequestUrl(request, 'new-password');
        return reply.view('new-password', {
          alert: {
            type: 'error',
            message: userFacingMessage,
            error_type: userFacingError,
          },
          hash: cookie.hash,
          id: cookie.id,
          emailId: cookie.emailId,
          time: cookie.time,
          requestUrl,
        });
      }
    }

    return reply.view('error', {
      alert: {
        type: 'error',
        title: 'Error during password reset',
        message: '<p>There was an internal error resetting your password. Please try again by visiting <a href="/password">https://auth.humanitarian.id/password</a></p>',
        error_type: 'PW-RESET-GENERAL',
      },
      query: request.payload,
    });
  },

  // Display a default user page when user is logged in without OAuth
  async user(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    logger.info(
      '[ViewController->user] Showing user dashboard.',
      {
        request,
        user: {
          id: user.id,
          email: user.email,
          admin: user.is_admin,
        },
      },
    );

    return reply.view('user', {
      user,
    });
  },

  // View the user profile.
  async profile(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // If the cookie has an alert to display, load it into the page and erase it
    // from the cookie.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete cookie.alert;
      request.yar.set('session', cookie);
    }

    // Render profile page.
    return reply.view('profile-show', {
      alert,
      user,
    });
  },

  // Edit the user profile.
  async profileEdit(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // If the cookie has an alert to display, load it into the page and erase it
    // from the cookie.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete cookie.alert;
      request.yar.set('session', cookie);
    }

    return reply.view('profile-edit', {
      user,
      alert,
    });
  },

  /**
   * Form submission handler for basic profile management.
   */
  async profileEditSubmit(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // We might need to send feedback. Create an alert/errors variables.
    let alert = {};
    const reasons = [];

    // Did we get a valid payload object?
    if (!request.payload) {
      reasons.push('There was an server error while processing the form. Please try again.');
      logger.warn(
        '[ViewController->profileEmailsSubmit] Received an empty form payload.',
        {
          request,
          fail: true,
          user: {
            id: cookie.userId,
          },
        },
      );
    }

    // Given name must exist.
    if (typeof request.payload.given_name !== 'undefined' && request.payload.given_name !== '') {
      // We found a given name.
    } else {
      reasons.push('Given name is required.');
    }

    // Family name must exist
    if (typeof request.payload.family_name !== 'undefined' && request.payload.family_name !== '') {
      // We found a family name.
    } else {
      reasons.push('Family name is required.');
    }

    // React to form validation errors.
    if (reasons.length > 0) {
      // Display the user feedback as an alert.
      alert = {
        type: 'error',
        message: `<p>Your basic profile info could not be saved.</p><ul><li>${reasons.join('</li><li>')}</li></ul>`,
      };

      // Show user the profile edit form again.
      return reply.view('profile-edit', {
        alert,
        user,
      });
    }

    // No errors were found, so load the user and update DB with the simple
    // profile fields that don't need special treatment.
    //
    // TODO: replace this with UserController.update().
    await User.findOneAndUpdate({ _id: cookie.userId }, {
      given_name: request.payload.given_name,
      family_name: request.payload.family_name,
    }, {
      runValidators: true,
      new: true,
    });

    logger.info(
      `[ViewController->profileEditSubmit] Updated user profile for ${cookie.userId}`,
      {
        user: {
          id: cookie.userId,
        },
      },
    );

    // Create a success confirmation.
    cookie.alert = {
      type: 'status',
      message: '<p>Your profile was saved.</p>',
    };

    // Finalize the user feedback.
    request.yar.set('session', cookie);

    // Redirect to profile on success.
    return reply.redirect('/profile');
  },

  /**
   * Form submission handler for email management.
   */
  async profileEmailsSubmit(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // We might need to send feedback. Create an alert/errors variables.
    let alert = {};
    const reasons = [];

    // Did we get a valid payload object?
    if (!request.payload) {
      reasons.push('There was an server error while processing the form. Please try again.');
      logger.warn(
        '[ViewController->profileEmailsSubmit] Received an empty form payload.',
        {
          request,
          fail: true,
          user: {
            id: cookie.userId,
          },
        },
      );
    }

    //
    // The desired primary email address must already be marked as 'validated'
    // in the DB.
    //
    // First, check if the field even has a value.
    if (request.payload.email_primary !== '') {
      // Loop through emails to find the one they want to mark as primary.
      user.emails.forEach((thisEmail) => {
        // We found it, so check if it is already 'validated' in DB.
        if (request.payload.email_primary === thisEmail.email) {
          if (thisEmail.validated) {
            // The email is eligible to be primary.
          } else {
            reasons.push(`You selected ${thisEmail.email} to be your primary address, but it is not confirmed.`);
          }
        }
      });
    }

    // If an email was chosen to be deleted.
    if (typeof request.payload.email_delete !== 'undefined') {
      if (request.payload.email_delete === request.payload.email_primary) {
        reasons.push(`You attempted to delete ${request.payload.email_delete}, but also selected it to be your primary address.`);
      }
    }

    // If an email was chosen to receive a confirmation link.
    if (typeof request.payload.email_confirm !== 'undefined') {
      // eslint-disable-next-line max-len
      const emailIsConfirmedAlready = user.emails.filter((thisEmail) => thisEmail.email === request.payload.email_confirm && thisEmail.validated);
      if (emailIsConfirmedAlready.length > 0) {
        reasons.push(`You attempted to confirm ${request.payload.email_confirm}, but it doesn't need confirmation.`);
      }
    }

    // No special validation needed for new emails at this time.
    // If we wanted to validate, do it here.
    // if (request.payload.email_new) {}

    // React to form validation errors.
    if (reasons.length > 0) {
      // Display the user feedback as an alert.
      alert = {
        type: 'error',
        message: `<p>Your email settings could not be saved.</p><ul><li>${reasons.join('</li><li>')}</li></ul>`,
      };

      // Show user the profile edit form again.
      return reply.view('profile-edit', {
        alert,
        user,
      });
    }

    //
    // No errors were found, make updates to emails
    //

    // Create a success confirmation.
    cookie.alert = {
      type: 'status',
      message: '<p>Your email settings were saved.</p>',
    };

    // First, set primary email address using internal method.
    if (request.payload.email_primary !== user.email) {
      await UserController.setPrimaryEmail({}, {
        userId: cookie.userId,
        email: request.payload.email_primary,
      }).then(() => {
        cookie.alert.message += `<p>Your primary email was set to ${request.payload.email_primary}</p>`;
      }).catch(() => {
        cookie.alert.type = 'error';
        cookie.alert.message = '<p>There was a problem setting your primary email address.</p>';
      });
    }

    // If an email address was chosen to be deleted, drop it from the profile
    if (request.payload.email_delete) {
      await UserController.dropEmail({}, {
        userId: cookie.userId,
        email: request.payload.email_delete,
      }).then(() => {
        cookie.alert.message += `<p>You deleted ${request.payload.email_delete} from your account.</p>`;
      }).catch(() => {
        cookie.alert.type = 'error';
        cookie.alert.message = `<p>There was a problem removing ${request.payload.email_delete} from your account.</p>`;
      });
    }

    // If a confirmation email was requested, send it
    if (request.payload.email_confirm) {
      const emailIndex = user.emailIndex(request.payload.email_confirm);
      const confirmEmail = user.emails[emailIndex];
      await EmailService.sendValidationEmail(
        user,
        confirmEmail.email,
        confirmEmail._id.toString(),
      ).then(() => {
        cookie.alert.message += '<p>The confirmation email will arrive in your inbox shortly.</p>';
      }).catch(() => {
        cookie.alert.type = 'error';
        cookie.alert.message = '<p>There was a problem sending the confirmation email.</p>';
      });
    }

    // If a new email address was submitted, add it to the user profile. The
    // internal function will handle the confirmation email being sent.
    if (request.payload.email_new) {
      await UserController.addEmail({}, {
        userId: cookie.userId,
        email: request.payload.email_new,
      }).then(() => {
        cookie.alert.message += `<p>A confirmation email has been sent to ${request.payload.email_new}.</p>`;
      }).catch((err) => {
        cookie.alert.type = 'error';

        // Read our error and show some user feedback.
        if (err.message && err.message.indexOf('Email already exists') !== -1) {
          cookie.alert.message = `<p>The address ${request.payload.email_new} is already added to your account.</p>`;
        } else if (err.message && err.message.indexOf('Email is not unique') !== -1) {
          cookie.alert.message = `<p>The address ${request.payload.email_new} is already registered.</p>`;
        }
      });
    }

    // Finalize the user feedback.
    request.yar.set('session', cookie);

    // Redirect to profile on success.
    return reply.redirect('/profile/edit');
  },

  // Display the user settings page when user is logged in.
  async settings(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // Check for user feedback and display
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete cookie.alert;
      request.yar.set('session', cookie);
    }

    // Render settings page.
    return reply.view('settings', {
      user,
      alert,
    });
  },

  /**
   * Handle form submissions related to OAuth Client management.
   */
  async settingsOauthSubmit(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // Set up user feedback.
    const alert = {};
    const reasons = [];

    // Did they try to delete an OAuth client?
    if (request.payload && request.payload.oauth_client_revoke) {
      // TODO: if we can, pull this from a canonical source. This was copied
      //       from the routes config file and should always stay in sync.
      //
      // @see config/routes.js
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (objectIdRegex.test(request.payload.oauth_client_revoke)) {
        // Data seems valid. We will attempt to remove from profile.
        // eslint-disable-next-line max-len
        const clientExists = user.authorizedClients.some((client) => client._id.toString() === request.payload.oauth_client_revoke);
        if (clientExists) {
          // We'll try to revoke the client.
        } else {
          reasons.push('We couldn\'t find the OAuth Client on your profile.');
        }
      } else {
        reasons.push('We didn\'t recognize the ID for that OAuth Client. Please try to revoke the OAuth Client again.');
      }
    }

    // Did we find validation errors?
    if (reasons.length > 0) {
      alert.type = 'error';
      alert.message = `<p>We couldn't revoke the OAuth Client you requested.</p><p>${reasons.join('<br>')}</p>`;
    } else {
      // No validation errors. Perform DB operation and provide user feedback.
      // eslint-disable-next-line max-len
      const revokedClient = user.authorizedClients.filter((client) => client._id.toString() === request.payload.oauth_client_revoke)[0];
      await UserController.revokeOauthClient({}, {
        userId: cookie.userId,
        clientId: request.payload.oauth_client_revoke,
      }).then(() => {
        alert.type = 'status';
        alert.message = `
          <p>You successfully revoked <strong>${revokedClient.name}</strong> from your profile.</p>
          <p>If you wish to restore access you can log into that website again using HID.</p>
        `;
      }).catch((err) => {
        alert.type = 'error';
        alert.message = err.message;
      });
    }

    // Set user feedback in cookie.
    cookie.alert = alert;
    request.yar.set('session', cookie);

    // Redirect back to settings.
    return reply.redirect('/settings');
  },

  /**
   * User settings: render form to change password
   *
   * It shows the three form elements (current, new, confirm).
   */
  async settingsPassword(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // Check for user feedback to display.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete cookie.alert;
      request.yar.set('session', cookie);
    }

    // Check if we need TOTP Prompt.
    let totpPrompt = false;
    if (cookie.totpPrompt) {
      totpPrompt = true;
      delete cookie.totpPrompt;
      request.yar.set('session', cookie);
    }

    // Render settings-password page.
    return reply.view('settings-password', {
      user,
      alert,
      totpPrompt,
    });
  },

  /**
   * User settings: handle submissions to change password
   *
   * This handles all form submissions for changing password. Initial attempt
   * might result in a TOTP prompt and we handle that in the submission handler
   * in order to securely store the original password submissions temporarily.
   */
  async settingsPasswordSubmit(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // Set up user feedback
    const alert = {};
    const reasons = [];

    // Enforce TOTP if necessary.
    const token = request.payload && request.payload['x-hid-totp'];
    await AuthPolicy.isTOTPEnabledAndValid({}, {
      user,
      totp: token,
    }).then(() => {
      // Since all users (whether they use TOTP or not) will make it to this
      // success stage, check cookie and see if the form data is here.
      //
      // If we find it, load the data into request.payload like the initial
      // form submission.
      if (cookie.formData) {
        request.payload.old_password = cookie.formData.old_password;
        request.payload.new_password = cookie.formData.new_password;
        request.payload.confirm_password = cookie.formData.confirm_password;
      }

      // Now clean up the cookie.
      delete cookie.totpPrompt;
      delete cookie.formData;
    }).catch((err) => {
      // Cookie the form data so we prompt for TOTP without either populating
      // the form (and thereby printing their password in HTML) or making the
      // person re-enter the form data. The cookie is encrypted and only the
      // server can read the contents.
      //
      // We wrap the assignment in a conditional to allow for multiple attempts
      // at entering the TOTP. If we blindly set the request data, a second TOTP
      // attempt will erase formDara and set everything to empty strings.
      cookie.totpPrompt = true;
      if (!cookie.formData) {
        cookie.formData = {
          old_password: request.payload.old_password,
          new_password: request.payload.new_password,
          confirm_password: request.payload.confirm_password,
        };
      }

      // Display error about invalid TOTP.
      if (err.message.indexOf('Invalid') !== -1) {
        alert.type = 'error';
        reasons.push('Your two-factor authentication code was invalid.');
      } else {
        reasons.push('Enter your two-factor authentication to update the password.');
      }
    });

    // Basic form validation. We only run this if the cookie.formData is empty.
    if (!cookie.formData) {
      if (
        request.payload
        && request.payload.old_password
        && request.payload.new_password
        && request.payload.confirm_password
      ) {
        if (request.payload.new_password === request.payload.confirm_password) {
          // We have the data we need to attempt password update.
        } else {
          reasons.push('The password confirmation field did not match. Please try again.');
        }
      } else {
        // missing params
        reasons.push('Fill in all fields to change your password.');
      }
    }

    // If there are errors/warnings with submission, display them.
    if (reasons.length > 0) {
      alert.type = alert.type === 'error' ? 'error' : 'warning';
      alert.message = `<p>${reasons.join('</p><p>')}</p>`;
    } else {
      // Attempt password update.
      await UserController.updatePassword(request, reply, {
        userId: cookie.userId,
        old_password: request.payload.old_password,
        new_password: request.payload.new_password,
      }).then(() => {
        alert.type = 'status';
        alert.message = 'Your password has been updated.';
      }).catch((err) => {
        // Set error message.
        alert.type = 'error';
        alert.message = err.message;
      });
    }

    // Finalize cookie (feedback, TOTP status, etc.)
    cookie.alert = alert;
    request.yar.set('session', cookie);

    // Always redirect, to avoid resubmitting when user refreshes browser.
    return reply.redirect('/settings/password');
  },

  /**
   * User settings: render form to manage 2FA
   */
  async settingsSecurity(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // Check for user feedback to display.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete cookie.alert;
    }

    // Check if we need TOTP Prompt.
    let totpPrompt = false;
    if (cookie.totpPrompt) {
      totpPrompt = true;
      delete cookie.totpPrompt;
    }

    // Check which step of 2FA process we're on
    let step = 0;
    if (cookie.step) {
      step = cookie.step;
      delete cookie.step;
    }

    // See if we have formData to send
    let formData;
    if (cookie.formData) {
      formData = cookie.formData;
      delete cookie.formData;
    }

    // Finalize cookie data
    request.yar.set('session', cookie);

    // Status is a user-facing label
    const status = user.totp ? 'enabled' : 'disabled';

    // Action is a machine-facing value in the HTML forms.
    const action = user.totp ? 'disable' : 'enable';

    // Render settings-security page.
    return reply.view('settings-security', {
      user,
      alert,
      formData,
      totpPrompt,
      step,
      status,
      action,
    });
  },

  /**
   * User settings: handle submissions to manage 2FA
   */
  async settingsSecuritySubmit(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // Set up all our variables for state management
    const alert = {};
    const reasons = [];
    let action = false;

    // Check which action we're taking
    if (request.payload && typeof request.payload.action !== 'undefined') {
      action = request.payload.action;
    } else {
      reasons.push('We apologize, but there was a problem on the server. Please restart the process or if problems persist, contact info@humanitarian.id and include this error code: <code>Error SEC0</code>.');

      logger.warn(
        '[ViewController->settingsSecuritySubmit] `action` was not defined on 2FA setup form. SEC0',
        {
          fail: true,
          user: {
            id: user.id,
            email: user.email,
          },
        },
      );
    }

    // Check for validation problems.
    if (reasons.length > 0) {
      alert.type = alert.type === 'error' ? 'error' : 'warning';
      alert.message = `<p>${reasons.join('</p><p>')}</p>`;
    } else {
      // User is starting process to disable 2FA.
      if (action === 'disable') {
        cookie.step = 1;
      }

      // User is disabling 2FA.
      if (action === 'totp-disable') {
        // Ensure token was valid before disabling 2FA.
        const token = request.payload['x-hid-totp'];
        await AuthPolicy.isTOTPValid(user, token).then(async () => {
          // Now disable the 2FA.
          await TOTPController.disable({}, {
            user,
          }).then(() => {
            // If we made it here, 2FA is already disabled.
            alert.type = 'status';
            alert.message = `
              <p>You have successfully <strong>disabled</strong> two-factor authentication.</p>
              <p>You should destroy the HID entry on your authenticator app, as well as any backup codes you had. If you wish to re-enable 2FA, you may do so at any time.</p>
            `;
            cookie.step = 0;
          }).catch((err) => {
            throw err;
          });
        }).catch((err) => {
          // Display error about invalid TOTP, or pass message along.
          alert.type = 'error';
          if (err.message.indexOf('Invalid') !== -1) {
            alert.message = 'Your two-factor authentication code was invalid.';
          } else {
            alert.message = err.message;
          }
        });
      }

      // User is starting the process to enable their 2FA
      if (action === 'enable') {
        await TOTPController.generateConfig({}, {
          user,
        }).then((data) => {
          // Prepare to display configuration to user.
          cookie.formData = {
            totpConf: {
              qr: data.qrcode,
              url: data.url,
            },
          };

          // Proceed to step 1.
          cookie.step = 1;
        }).catch((err) => {
          alert.type = 'error';
          alert.message = err.message;
        });
      }

      // User is enabling 2FA.
      if (action === 'totp-enable') {
        // Ensure token is valid before enabling 2FA.
        const token = request.payload['x-hid-totp'];
        await AuthPolicy.isTOTPValid(user, token).then(async () => {
          // Enable 2FA for this user.
          await TOTPController.enable({}, {
            user,
          }).then(async () => {
            // If we made it here, 2FA is enabled! Immediately issue backup codes
            // to be displayed alongside the success message.
            await TOTPController.generateBackupCodes({}, {
              user,
            }).then((data) => {
              // Prepare to display backup codes to user.
              delete cookie.formData;
              cookie.formData = {
                backupCodes: data,
              };

              // Proceed to step 2.
              cookie.step = 2;
            }).catch((err) => {
              throw err;
            });
          }).catch((err) => {
            throw err;
          });
        }).catch((err) => {
          // Display error about invalid TOTP, or pass message along.
          alert.type = 'error';
          if (err.message.indexOf('Invalid') !== -1) {
            alert.message = '<p>Your two-factor authentication code was invalid.</p>';
          } else {
            alert.message = err.message;
          }
        });
      }
    }

    // Finalize cookie (feedback, TOTP status, etc.)
    cookie.alert = alert;
    request.yar.set('session', cookie);

    // Always redirect to form, so we avoid resubmitting when user chooses to
    // refresh their browser.
    return reply.redirect('/settings/security');
  },

  /**
   * User settings: render form to delete account
   */
  async settingsDelete(request, reply) {
    const cookie = request.yar.get('session');
    const user = await User.findById(cookie.userId);

    // Check for user feedback to display.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete cookie.alert;
      request.yar.set('session', cookie);
    }

    // Check if we need TOTP Prompt.
    let totpPrompt = false;
    if (cookie.totpPrompt) {
      totpPrompt = true;
      delete cookie.totpPrompt;
      request.yar.set('session', cookie);
    }

    // Render settings-delete page.
    return reply.view('settings-delete', {
      user,
      alert,
      totpPrompt,
    });
  },

  /**
   * User settings: handle submissions to delete account
   */
  async settingsDeleteSubmit(request, reply) {
    try {
      const cookie = request.yar.get('session');
      const user = await User.findById(cookie.userId);

      // Set up user feedback
      const alert = {};
      let reasons = [];

      // Validate form submission for non-admins. There are two possibilities:
      // - cookie.formData implies they already validated email and are submitting TOTP
      const deletionConfirmed = cookie.formData && cookie.formData.primary_email === user.email;
      // - otherwise check form submission and verify input
      // eslint-disable-next-line max-len
      const payloadIsValid = request.payload && request.payload.primary_email && request.payload.primary_email === user.email;

      if (deletionConfirmed || payloadIsValid) {
        // form was validated
      } else {
        reasons.push('Please enter your <strong>primary email address</strong> to confirm that you want to delete your account.');
      }

      // Tell especially persistent admins that they cannot delete their accounts.
      if (user.is_admin) {
        alert.type = 'error';
        // In this case, we want to wipe the old feedback.
        reasons = [];
        reasons.push('Admins cannot delete their accounts. Remove your own admin status before deleting the account.');
      } else if (reasons.length === 0) {
        // If user is NOT admin, and form was validated, then check if 2FA is
        // enabled and enforce.
        const token = request.payload && request.payload['x-hid-totp'];
        await AuthPolicy.isTOTPEnabledAndValid({}, {
          user,
          totp: token,
        }).then(() => {
          // Clean up the cookie for 2FA users.
          delete cookie.totpPrompt;
          delete cookie.formData;
        }).catch((err) => {
          // Cookie the form data so we prompt for TOTP without populating the
          // form, potentially allowing someone to alter their previous input
          // by editing DOM, or forcing them re-enter the email confirmation.
          //
          // We wrap the assignment in a conditional to allow for multiple attempts
          // at entering the TOTP. If we blindly set the request data, a second TOTP
          // attempt will erase formDara and set everything to empty strings.
          cookie.totpPrompt = true;
          if (!cookie.formData) {
            cookie.formData = {
              primary_email: request.payload.primary_email,
            };
          }

          // Display error about invalid TOTP.
          //
          // If we made it this far, the other feedback isn't necessary, so we
          // clear the reasons array before setting TOTP feedback.
          reasons = [];
          if (err.message.indexOf('Invalid') !== -1) {
            alert.type = 'error';
            reasons.push('Your two-factor authentication code was invalid.');
          } else {
            reasons.push('Enter your two-factor authentication code to delete your account.');
          }
        });
      }

      if (reasons.length > 0) {
        alert.type = alert.type === 'error' ? 'error' : 'warning';
        alert.message = `<p>${reasons.join('</p><p>')}</p>`;
      } else {
        // So long, and thanks for all the fish!
        await user.deleteOne().catch((err) => {
          logger.error(
            `[ViewController->settingsDeleteSubmit] ${err.message}`,
            {
              request,
              fail: true,
              stack_trace: err.stack,
            },
          );
        });

        logger.info(
          `[ViewController->settingsDeleteSubmit] Removed user ${cookie.userId}`,
          {
            security: true,
            user: {
              id: cookie.userId,
            },
          },
        );

        // Overwrite the existing cookie with a fresh, empty object. This will
        // ensure that no further actions can be taken, and that even browser
        // refreshes won't be able to re-sumbit the form.
        request.yar.set('session', {});

        // Set up user feedback.
        alert.type = 'status';
        alert.message = '<p>You have successfully deleted your account.</p>';

        // Display confirmation of deletion.
        return reply.view('message', {
          title: 'Account deleted',
          alert,
        });
      }

      // Finalize cookie (feedback, TOTP status, etc.)
      cookie.alert = alert;
      request.yar.set('session', cookie);

      // Always redirect, to avoid resubmitting when user refreshes browser.
      return reply.redirect('/settings/delete');
    } catch (err) {
      logger.error(
        err.message,
        {
          fail: true,
          stack_trace: err.stack,
        },
      );

      // TODO: show something, e.g. message.html
    }

    // If we somehow fall through, redirect to homepage.
    return reply.redirect('/');
  },

  /**
   * Utilities: HTTP 404 Page
   *
   * Sends JSON by default.
   * Sends HTML if `text/html` content-type is anywhere in the Accept header.
   */
  async http404Page(request, reply) {
    const accept = request.raw.req.headers.accept;

    // Check header if there’s a request accepting HTML.
    if (accept && accept.match(/text\/html/)) {
      return reply.view('message', {
        title: 'Not Found',
        alert: {
          type: 'warning',
          message: '<p>The URL you requested doesn\'t exist.</p>',
        },
      }).code(404);
    }

    // Fallback to JSON response.
    return Boom.notFound();
  },
};
