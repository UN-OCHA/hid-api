const Boom = require('@hapi/boom');
const Recaptcha = require('recaptcha2');
const Client = require('../models/Client');
const User = require('../models/User');
const HelperService = require('../services/HelperService');
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
            type: 'danger',
            message: 'The configuration of the client application is invalid. We can not log you in.',
          };
          return reply.view('login', loginArgs);
        }
        return reply.view('login', loginArgs);
      } catch (err) {
        loginArgs.alert = {
          type: 'danger',
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
          type: 'danger',
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
          type: 'success',
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
            type: 'danger',
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
          type: 'danger',
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
    if (!request.query.hash && !request.query.id && !request.query.time) {
      throw Boom.badRequest('Missing hash parameter');
    }
    request.payload = {
      hash: request.query.hash,
      id: request.query.id,
      time: request.query.time,
      emailId: request.query.emailId,
    };
    const registerLink = _getRegisterLink(request.query);
    const passwordLink = _getPasswordLink(request.query);
    try {
      await UserController.validateEmail(request);
      return reply.view('login', {
        alert: { type: 'success', message: 'Thank you for confirming your email address. You can now log in' },
        query: request.query,
        registerLink,
        passwordLink,
      });
    } catch (err) {
      return reply.view('login', {
        alert: { type: 'danger', message: 'There was an error confirming your email address.' },
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
        alert: { type: 'success', message: `Password reset was sent to ${request.payload.email}. Please make sure the email address is correct. If not, please reset your password again.` },
        query: request.query,
        registerLink,
        passwordLink,
      });
    } catch (err) {
      return reply.view('login', {
        alert: { type: 'danger', message: 'There was an error resetting your password.' },
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
          type: 'danger',
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
              type: 'success',
              message: 'Your password was successfully reset. You can now login.',
            },
            query: request.payload,
            registerLink,
            passwordLink,
          });
        }
        return reply.view('message', {
          alert: {
            type: 'success',
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
              type: 'danger',
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
            type: 'danger',
            message: 'There was an error resetting your password. Please try again.',
          },
          query: request.payload,
          requestUrl,
        });
      }
    }

    return reply.view('message', {
      alert: { type: 'danger', message: 'There was an error resetting your password.' },
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

  // Save edits to user profile
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
    }

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
        type: 'danger',
        message: '<p>Your profile could not be saved.</p><ul><li>' + reasons.join('</li><li>') + '</li></ul>',
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
        type: 'success',
        message: '<p>Your profile was saved.</p>',
      };

      // Finalize the user feedback.
      request.yar.set('session', cookie);

      // Redirect to profile on success.
      return reply.redirect('/profile');
    }
  },

  // Handle changes to emails on a profile
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
    }

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
            reasons.push(`You selected ${thisEmail} to be your primary address, but it is not confirmed.`);
          }
        }
      });
    }

    // No special validation needed for new emails at this time.
    // If we wanted to validate, do it here.
    if (request.payload.email_new) {}

    // React to form validation errors.
    if (reasons.length > 0) {
      // Display the user feedback as an alert.
      alert = {
        type: 'danger',
        message: '<p>Your profile could not be saved.</p><ul><li>' + reasons.join('</li><li>') + '</li></ul>',
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
        type: 'success',
        message: '<p>Your profile was saved.</p>',
      };

      // Set primary email address using internal method. The first object is a
      // mock of the request payload we'd send when making client-side JS calls.
      if (request.payload.email_primary !== user.email) {
        await UserController.setPrimaryEmail({}, {
          userId: cookie.userId,
          email: request.payload.email_primary,
        }).then(data => {
          cookie.alert.message += `<p>Your primary email was set to ${request.payload.email_primary}</p>`;
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
          // Read our error and show some user feedback.
          if (err.message.indexOf('Email is not unique') !== -1) {
            cookie.alert.message += `<p>The address ${request.payload.email_new} is already added to your account.</p>`;
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
    const user = await User.findOne({ _id: cookie.userId });
    return reply.view('settings', {
      user,
    });
  },
};
