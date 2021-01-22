const Boom = require('@hapi/boom');
const Recaptcha = require('recaptcha2');
const Client = require('../models/Client');
const User = require('../models/User');
const EmailService = require('../services/EmailService');
const HelperService = require('../services/HelperService');
const TOTPController = require('./TOTPController');
const UserController = require('./UserController');
const AuthPolicy = require('../policies/AuthPolicy');
const config = require('../../config/env')[process.env.NODE_ENV];

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

    if (cookie && cookie.userId && cookie.totp === true) { // User is already logged in
      if (request.query.client_id
        && request.query.redirect_uri
        && request.query.response_type
        && request.query.scope) {
        // Redirect to /oauth/authorize
        let redirect = request.query.redirect || '/oauth/authorize';
        redirect += `?client_id=${request.query.client_id}`;
        redirect += `&redirect_uri=${request.query.redirect_uri}`;
        redirect += `&response_type=${request.query.response_type}`;
        if (request.query.state) {
          redirect += `&state=${request.query.state}`;
        }
        redirect += `&scope=${request.query.scope}`;

        return reply.redirect(redirect);
      }
      // User is already logged in
      return reply.redirect('/user');
    }

    if (cookie && cookie.userId && cookie.totp === false) {
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
      alert: false,
    };

    // Check client ID and redirect URI at this stage, so we can send an error message if needed.
    if (request.query.client_id) {
      try {
        const client = await Client.findOne({ id: request.query.client_id });
        if (!client
          || (client && client.redirectUri !== request.query.redirect_uri
            && !client.redirectUrls.includes(request.query.redirect_uri))) {
          loginArgs.alert = {
            type: 'error',
            message: 'The configuration of the client application is invalid. We can not log you in.',
          };
          return reply.view('login', loginArgs);
        }
        return reply.view('login', loginArgs);
      } catch (err) {
        loginArgs.alert = {
          type: 'error',
          message: 'Internal server error. We can not log you in. Please let us know at info@humanitarian.id',
        };
        return reply.view('login', loginArgs);
      }
    } else {
      return reply.view('login', loginArgs);
    }
  },

  async logout(request, reply) {
    request.yar.reset();
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
          return reply.redirect(request.query.redirect);
        }
        logger.warn(`Redirecting to ${request.query.redirect} is not allowed`, { security: true, fail: true, request });
        return reply.redirect('/');
      } catch (err) {
        logger.error(
          'Error logging user out',
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
    } else {
      return reply.redirect('/');
    }
  },

  register(request, reply) {
    const requestUrl = _buildRequestUrl(request, 'verify2');
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
    const requestUrl = _buildRequestUrl(request, 'verify2');
    const registerLink = _getRegisterLink(request.payload);
    const passwordLink = _getPasswordLink(request.payload);
    try {
      await recaptcha.validate(request.payload['g-recaptcha-response']);
    } catch (err) {
      logger.warn(
        '[ViewController->registerPost] Failure during reCAPTCHA validation.',
        {
          request,
          security: true,
          fail: true,
        },
      );

      return reply.view('register', {
        alert: {
          type: 'error',
          message: 'There was a problem validating your registration. Please try again.',
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
      if (errorMessage && errorMessage.indexOf('password is not strong') !== -1) {
        userMessage = 'Your password was not strong enough. Please check the requirements and try again.';
      }
      if (errorMessage && errorMessage.indexOf('passwords do not match') !== -1) {
        userMessage = 'Your password fields did not match. Please try again and carefully confirm the password.';
      }

      // Add a domain from the allow-list.
      const requestUrl = _buildRequestUrl(request, 'register');

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
    const cookie = request.yar.get('session');

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
        emailId: request.query.emailId,
      };

      await UserController.validateEmail(request);

      // If user is logged in, send them to their profile.
      if (cookie && cookie.userId) {
        cookie.alert = {
          type: 'status',
          message: 'Thank you for confirming your email address. It can now be set as your primary email if you wish.',
        }
        request.yar.set('session', cookie);

        return reply.redirect('/profile/edit');
      }

      return reply.view('login', {
        alert: {
          type: 'status',
          message: 'Thank you for confirming your account. You can now log in',
        },
        query: request.query,
        registerLink,
        passwordLink,
      });
    } catch (err) {
      return reply.view('login', {
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
    const requestUrl = _buildRequestUrl(request, 'new_password');
    return reply.view('password', {
      requestUrl,
    });
  },

  async passwordPost(request, reply) {
    const registerLink = _getRegisterLink(request.payload);
    const passwordLink = _getPasswordLink(request.payload);
    try {
      await UserController.resetPasswordEndpoint(request);
      return reply.view('login', {
        alert: { type: 'status', message: `Password reset was sent to ${request.payload.email}. Please make sure the email address is correct. If not, please reset your password again.` },
        query: request.query,
        registerLink,
        passwordLink,
      });
    } catch (err) {
      return reply.view('login', {
        alert: { type: 'error', message: 'There was an error resetting your password.' },
        query: request.query,
        registerLink,
        passwordLink,
      });
    }
  },

  async newPassword(request, reply) {
    request.yar.reset();
    request.yar.set('session', {
      hash: request.query.hash, id: request.query.id, time: request.query.time, totp: false,
    });
    const user = await User.findOne({ _id: request.query.id });
    if (!user) {
      return reply.view('error');
    }
    if (user.totp) {
      return reply.view('totp', {
        query: request.query,
        destination: '/new_password',
        alert: false,
      });
    }
    request.yar.set('session', {
      hash: request.query.hash, id: request.query.id, time: request.query.time, totp: true,
    });
    return reply.view('new_password', {
      query: request.query,
      hash: request.query.hash,
      id: request.query.id,
      time: request.query.time,
    });
  },

  async newPasswordPost(request, reply) {
    const cookie = request.yar.get('session');

    if (cookie && cookie.hash && cookie.id && cookie.time && !cookie.totp) {
      try {
        const user = await User.findOne({ _id: cookie.id });
        const token = request.payload['x-hid-totp'];
        await AuthPolicy.isTOTPValid(user, token);
        cookie.totp = true;
        request.yar.set('session', cookie);
        return reply.view('new_password', {
          query: request.payload,
          hash: cookie.hash,
          id: cookie.id,
          time: cookie.time,
        });
      } catch (err) {
        const alert = {
          type: 'error',
          message: err.output.payload.message,
        };
        return reply.view('totp', {
          query: request.payload,
          destination: '/new_password',
          alert,
        });
      }
    }

    if (cookie && cookie.hash && cookie.totp) {
      const params = HelperService.getOauthParams(request.payload);
      const registerLink = _getRegisterLink(request.payload);
      const passwordLink = _getPasswordLink(request.payload);
      try {
        await UserController.resetPasswordEndpoint(request);
        if (params) {
          return reply.view('login', {
            alert: {
              type: 'status',
              message: 'Your password was successfully reset. You can now login.',
            },
            query: request.payload,
            registerLink,
            passwordLink,
          });
        }
        return reply.view('message', {
          alert: {
            type: 'status',
            message: 'Thank you for updating your password.',
          },
          query: request.payload,
          isSuccess: true,
          title: 'Password update',
        });
      } catch (err) {
        if (params) {
          return reply.view('login', {
            alert: {
              type: 'error',
              message: 'There was an error resetting your password. Please try again.',
            },
            query: request.payload,
            registerLink,
            passwordLink,
          });
        }

        const requestUrl = _buildRequestUrl(request, 'new_password');
        return reply.view('password', {
          alert: {
            type: 'error',
            message: 'There was an error resetting your password. Please try again.',
          },
          query: request.payload,
          requestUrl,
        });
      }
    }

    return reply.view('message', {
      alert: { type: 'error', message: 'There was an error resetting your password.' },
      query: request.payload,
      isSuccess: false,
      title: 'Password update',
    });
  },

  // Display a default user page when user is logged in without OAuth
  async user(request, reply) {
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }
    const user = await User.findOne({ _id: cookie.userId });
    return reply.view('user', {
      user,
    });
  },

  // View the user profile.
  async profile(request, reply) {
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Look up user in DB.
    const user = await User.findOne({ _id: cookie.userId });

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
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load user from DB
    const user = await User.findOne({ _id: cookie.userId });

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
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load user from DB for some validation operations.
    const user = await User.findOne({ _id: cookie.userId });

    // We might need to send feedback. Create an alert/errors variables.
    let alert = {};
    let reasons = [];

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
        message: '<p>Your basic profile info could not be saved.</p><ul><li>' + reasons.join('</li><li>') + '</li></ul>',
      };

      // Show user the profile edit form again.
      return reply.view('profile-edit', {
        alert,
        user,
      });
    } else {
      // No errors were found, so load the user and update DB with the simple
      // profile fields that don't need special treatment.
      //
      // TODO: replace this with UserController.update().
      const user = await User.findOneAndUpdate({ _id: cookie.userId }, {
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
    }
  },

  /**
   * Form submission handler for email management.
   */
  async profileEmailsSubmit(request, reply) {
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load user from DB for some validation operations.
    const user = await User.findOne({ _id: cookie.userId });

    // We might need to send feedback. Create an alert/errors variables.
    let alert = {};
    let reasons = [];

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
      user.emails.forEach(thisEmail => {
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
      const emailIsConfirmedAlready = user.emails.filter(thisEmail => thisEmail.email === request.payload.email_confirm && thisEmail.validated);
      if (emailIsConfirmedAlready.length > 0) {
        reasons.push(`You attempted to confirm ${request.payload.email_confirm}, but it doesn't need confirmation.`);
      }
    }

    // No special validation needed for new emails at this time.
    // If we wanted to validate, do it here.
    if (request.payload.email_new) {}

    // React to form validation errors.
    if (reasons.length > 0) {
      // Display the user feedback as an alert.
      alert = {
        type: 'error',
        message: '<p>Your email settings could not be saved.</p><ul><li>' + reasons.join('</li><li>') + '</li></ul>',
      };

      // Show user the profile edit form again.
      return reply.view('profile-edit', {
        alert,
        user,
      });
    } else {
      // No errors were found, make updates to emails

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
        }).then(data => {
          cookie.alert.message += `<p>Your primary email was set to ${request.payload.email_primary}</p>`;
        });
        // TODO: add a .catch() to avoid sploding the server.
      }

      // If an email address was chosen to be deleted, drop it from the profile
      if (request.payload.email_delete) {
        await UserController.dropEmail({}, {
          userId: cookie.userId,
          email: request.payload.email_delete,
        }).then(data => {
          cookie.alert.message += `You deleted ${request.payload.email_delete} from your account.`;
        }).catch(err => {
          cookie.alert.type = 'error';
          cookie.alert.message = `There was a problem removing ${request.payload.email_delete} from your account.`;
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
          _buildRequestUrl(request, 'verify2')
        ).then(data => {
          cookie.alert.message += 'The confirmation email will arrive in your inbox shortly.';
        }).catch(err => {
          cookie.alert.type = 'error';
          cookie.alert.message = 'There was a problem sending the confirmation email.';
        });
      }

      // If a new email address was submitted, add it to the user profile. The
      // internal function will handle the confirmation email being sent.
      if (request.payload.email_new) {
        await UserController.addEmail({}, {
          userId: cookie.userId,
          email: request.payload.email_new,
          appValidationUrl: _buildRequestUrl(request, 'verify2'),
        }).then(data => {
          cookie.alert.message += `<p>A confirmation email has been sent to ${request.payload.email_new}.</p>`;
        }).catch(err => {
          cookie.alert.type = 'error';

          // Read our error and show some user feedback.
          if (err.message && err.message.indexOf('Email already exists') !== -1) {
            cookie.alert.message = `<p>The address ${request.payload.email_new} is already added to your account.</p>`;
          }
          else if (err.message && err.message.indexOf('Email is not unique') !== -1) {
            cookie.alert.message = `<p>The address ${request.payload.email_new} is already registered.</p>`;
          }
        });
      }

      // Finalize the user feedback.
      request.yar.set('session', cookie);

      // Redirect to profile on success.
      return reply.redirect('/profile/edit');
    }
  },

  // Display the user settings page when user is logged in.
  async settings(request, reply) {
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Check for user feedback and display
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete(cookie.alert);
      request.yar.set('session', cookie);
    }

    // Load user from DB.
    const user = await User.findOne({ _id: cookie.userId });

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
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load current user from DB.
    const user = await User.findOne({ _id: cookie.userId });

    // Set up user feedback.
    let reasons = [];
    let alert = {};

    // Did they try to delete an OAuth client?
    if (request.payload && request.payload.oauth_client_delete) {
      // TODO: if we can, pull this from a canonical source. This was copied
      //       from the routes config file and should always stay in sync.
      //
      // @see config/routes.js
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (objectIdRegex.test(request.payload.oauth_client_delete)) {
        // Data seems valid. We will attempt to remove from profile.
        const clientExists = user.authorizedClients.some(client => client._id.toString() === request.payload.oauth_client_delete);
        if (clientExists) {
          // We'll try to revoke the client.
        } else {
          reasons.push("We couldn't find the OAuth Client on your profile.");
        }
      } else {
        reasons.push("We didn't recognize the ID for that OAuth Client. Please try to revoke the OAuth Client again.");
      }
    }

    // Did we find validation errors?
    if (reasons.length > 0) {
      alert.type = 'error';
      alert.message = `<p>We couldn't revoke the OAuth Client you requested.</p><p>${ reasons.join('<br>') }</p>`;
    } else {
      // No validation errors.
      // Perform DB operation and provide user feedback.
      const revokedClient = user.authorizedClients.filter(client => client._id.toString() === request.payload.oauth_client_delete)[0];
      await UserController.revokeOauthClient({}, {
        userId: cookie.userId,
        clientId: request.payload.oauth_client_delete,
      }).then(data => {
        alert.type = 'status';
        alert.message = `
          <p>You successfully revoked <strong>${revokedClient.name}</strong> from your profile.</p>
          <p>If you wish to restore access you can log into that website again using HID.</p>
        `;
      }).catch(err => {
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
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load current user from DB.
    const user = await User.findOne({ _id: cookie.userId });

    // Check for user feedback to display.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete(cookie.alert);
      request.yar.set('session', cookie);
    }

    // Check if we need TOTP Prompt.
    let totpPrompt = false;
    if (cookie.totpPrompt) {
      totpPrompt = true;
      delete(cookie.totpPrompt);
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
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Set up user feedback
    let alert = {};
    let reasons = [];

    // Load current user from DB.
    const user = await User.findOne({ _id: cookie.userId });

    // Enforce TOTP if necessary.
    const token = request.payload && request.payload['x-hid-totp'];
    await AuthPolicy.isTOTPEnabledAndValid({}, {
      user,
      totp: token,
    }).then(data => {
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
      delete(cookie.totpPrompt);
      delete(cookie.formData);
    }).catch(err => {
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
        reasons.push('Your two-factor authentication code was invalid.')
      } else {
        reasons.push('Enter your two-factor authentication to update the password.');
      }
    });

    // Basic form validation. We only run this if the cookie.formData is empty.
    if (!cookie.formData) {
      if (request.payload && request.payload.old_password && request.payload.new_password && request.payload.confirm_password) {
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
      alert.message = `<p>${ reasons.join('</p><p>') }</p>`;
    } else {
      // Attempt password update.
      await UserController.updatePassword(request, reply, {
        userId: cookie.userId,
        old_password: request.payload.old_password,
        new_password: request.payload.new_password,
      }).then(data => {
        alert.type = 'status';
        alert.message = 'Your password has been updated.';
      }).catch(err => {
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
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load current user from DB.
    const user = await User.findOne({ _id: cookie.userId });

    // Check for user feedback to display.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete(cookie.alert);
      request.yar.set('session', cookie);
    }

    // Check if we need TOTP Prompt.
    let totpPrompt = false;
    if (cookie.totpPrompt) {
      totpPrompt = true;
      delete(cookie.totpPrompt);
      request.yar.set('session', cookie);
    }

    // Check which step of 2FA process we're on
    let step = 0;
    if (cookie.step) {
      step = cookie.step;
      delete(cookie.step);
      request.yar.set('session', cookie);
    }

    // See if we have formData to send
    let formData;
    if (cookie.formData) {
      formData = cookie.formData;
      delete(cookie.formData);
      request.yar.set('session', cookie);
    }

    // Status is a user-facing label
    let status = user.totp ? 'enabled' : 'disabled';

    // Action is a machine-facing value in the HTML forms.
    let action = user.totp ? 'disable' : 'enable';

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
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Set up all our variables for state management
    let alert = {};
    let reasons = [];
    let action = false;

    // Load current user from DB.
    const user = await User.findOne({ _id: cookie.userId });

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
          }
        },
      );
    }

    // Check for validation problems.
    if (reasons.length > 0) {
      alert.type = alert.type === 'error' ? 'error' : 'warning';
      alert.message = `<p>${ reasons.join('</p><p>' )}</p>`;
    } else {

      // User is starting process to disable 2FA.
      if (action === 'disable') {
        cookie.step = 1;
      }

      // User is disabling 2FA.
      if (action === 'totp-disable') {

        // Ensure token was valid before disabling 2FA.
        const token = request.payload['x-hid-totp'];
        await AuthPolicy.isTOTPValid(user, token).then(async data => {

          // Now disable the 2FA.
          await TOTPController.disable({}, {
            user,
          }).then(data => {
            // If we made it here, 2FA is already disabled.
            alert.type = 'status';
            alert.message = `
              <p>You have successfully <strong>disabled</strong> two-factor authentication.</p>
              <p>You should destroy the HID entry on your authenticator app, as well as any backup codes you had. If you wish to re-enable 2FA, you may do so at any time.</p>
            `;
            cookie.step = 0;
          }).catch(err => {
            throw err;
          });

        }).catch(err => {
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
        }).then(data => {
          // Prepare to display configuration to user.
          cookie.formData = {
            totpConf: {
              qr: data.qrcode,
              url: data.url,
            },
          };

          // Proceed to step 1.
          cookie.step = 1;
        }).catch(err => {
          alert.type = 'error';
          alert.message = err.message;
        });
      }

      // User is enabling 2FA.
      if (action === 'totp-enable') {
        // Ensure token is valid before enabling 2FA.
        const token = request.payload['x-hid-totp'];
        await AuthPolicy.isTOTPValid(user, token).then(async data => {

          // Enable 2FA for this user.
          await TOTPController.enable({}, {
            user,
          }).then(async data => {
            // If we made it here, 2FA is enabled! Immediately issue backup codes
            // to be displayed alongside the success message.
            await TOTPController.generateBackupCodes({}, {
              user,
            }).then(data => {
              // Prepare to display backup codes to user.
              delete(cookie.formData);
              cookie.formData = {
                backupCodes: data,
              };

              // Proceed to step 2.
              cookie.step = 2;
            }).catch(err => {
              throw err;
            })
          }).catch(err => {
            throw err;
          });

        }).catch(err => {
          // Display error about invalid TOTP, or pass message along.
          alert.type = 'error';
          if (err.message.indexOf('Invalid') !== -1) {
            alert.message = 'Your two-factor authentication code was invalid.';
          } else {
            alert.message = err.message;
          }
        });

      } else {
        // TODO: reset the user's TOTP boolean/config so they can restart the
        //       process later on.
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
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load current user from DB.
    const user = await User.findOne({ _id: cookie.userId });

    // Check for user feedback to display.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete(cookie.alert);
      request.yar.set('session', cookie);
    }

    // Check if we need TOTP Prompt.
    let totpPrompt = false;
    if (cookie.totpPrompt) {
      totpPrompt = true;
      delete(cookie.totpPrompt);
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
    // If the user is not authenticated, redirect to the login page
    //
    // NOTE: normally we use const, but using let here since cookie will be
    //       overwritten if the user successfully deletes their account.
    let cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    try {
      // Load current user from DB.
      const user = await User.findOne({ _id: cookie.userId });

      // Set up user feedback
      let alert = {};
      let reasons = [];
      let destination = '/settings/delete';

      // Validate form submission for non-admins. There are two possibilities:
      // - cookie.formData implies they already validated email and are submitting TOTP
      // - otherwise check form submission and verify input
      if (
        cookie.formData && cookie.formData.primary_email === user.email
        || request.payload && request.payload.primary_email && request.payload.primary_email === user.email
      ) {
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
      } else {
        // If user is NOT admin, and form was validated, then check if 2FA is
        // enabled and enforce.
        if (reasons.length === 0) {
          const token = request.payload && request.payload['x-hid-totp'];
          await AuthPolicy.isTOTPEnabledAndValid({}, {
            user,
            totp: token,
          }).then(data => {
            // Clean up the cookie for 2FA users.
            delete(cookie.totpPrompt);
            delete(cookie.formData);
          }).catch(err => {
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
              reasons.push('Your two-factor authentication code was invalid.')
            } else {
              reasons.push('Enter your two-factor authentication code to delete your account.');
            }
          });
        }
      }

      if (reasons.length > 0) {
        alert.type = alert.type === 'error' ? 'error' : 'warning';
        alert.message = `<p>${ reasons.join('</p><p>') }</p>`;
      } else {
        // So long, and thanks for all the fish!
        await user.remove();

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
          alert,
          isSuccess: false,
          title: 'Account Deleted',
        });
      }

      // Finalize cookie (feedback, TOTP status, etc.)
      cookie.alert = alert;
      request.yar.set('session', cookie);

      // Always redirect, to avoid resubmitting when user refreshes browser.
      return reply.redirect(destination);
    } catch (err) {
      logger.error(
        err.message,
        {
          fail: true,
        }
      );

      // TODO: show something, e.g. message.html
    }
  },
};
