const crypto = require('crypto');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');

const Client = require('../models/Client');
const User = require('../models/User');
const HelperService = require('../services/HelperService');
const ClientController = require('./ClientController');
const TOTPController = require('./TOTPController');
const UserController = require('./UserController');
const AuthPolicy = require('../policies/AuthPolicy');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * Copied from route.js
 *
 * TODO: consolidate validation rules to be accessible in all parts of app.
 */
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Hash the MongoDB ObjectId to confirm it wasn't tampered with during form
 * submissions. By including a secret environment variable, this hash can't be
 * easily reproduced.
 */
function formHashContents(mongoId) {
  const hash = crypto.createHash('sha256');
  hash.update(`id:${mongoId},${process.env.COOKIE_PASSWORD}`);

  return hash.digest('hex');
}

module.exports = {

  /**
   * Admin: OAuth Client list
   */
  async adminOauthClients(request, reply) {
    // Load user cookie. Redirect to homepage when no cookie found.
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load current user from DB. We do this now in order to log user metadata,
    // and also so that the error page can still display the logged-in state of
    // the non-admin users.
    const user = await User.findOne({ _id: cookie.userId });

    // Check user authentication and admin permissions.
    try {
      AuthPolicy.isLoggedInAsAdmin(user);
    } catch (err) {
      logger.warn(
        '[AdminController->adminOauthClients] Non-admin attempted to access admin area',
        {
          security: true,
          fail: true,
          user: {
            id: cookie.userId,
            email: user.email,
          },
        },
      );

      // Display permission error to user.
      return reply.view('message', {
        user,
        title: 'Access forbidden',
        alert: {
          type: 'error',
          message: err.message,
        },
      }).code(403);
    }

    // User is authenticated as an admin. Proceed to build page.
    let options = {
      limit: 10000,
    };
    let criteria = {};
    let clientResponse = await ClientController.find(request, reply, {
      user,
      options,
      criteria,
    });

    // Extract clients and sort alphabetically with case-insensitivity
    let clients = clientResponse.source;
    clients.sort(function (a, b) {
      return a.name.localeCompare(b.name, {
        'sensitivity': 'base',
      });
    });

    // Check for user feedback to display.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete(cookie.alert);
      request.yar.set('session', cookie);
    }

    // Display page to user.
    return reply.view('admin', {
      user,
      alert,
      clients,
    });
  },


  /**
   * Admin: OAuth Client edit form
   */
  async adminOauthClientEdit(request, reply) {
    // Load user cookie. Redirect to homepage when no cookie found.
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Load current user from DB. We do this now in order to log user metadata,
    // and also so that the error page can still display the logged-in state of
    // the non-admin users.
    const user = await User.findOne({ _id: cookie.userId });

    // Check user authentication and admin permissions.
    try {
      AuthPolicy.isLoggedInAsAdmin(user);
    } catch (err) {
      logger.warn(
        '[AdminController->adminOauthClients] Non-admin attempted to access admin area',
        {
          security: true,
          fail: true,
          user: {
            id: cookie.userId,
            email: user.email,
          },
        },
      );

      // Display permission error to user.
      return reply.view('message', {
        user,
        title: 'Access forbidden',
        alert: {
          type: 'error',
          message: err.message,
        },
      }).code(403);
    }

    // Lookup the client we are about to edit.
    let alert;
    let client;
    let formHash = '';
    if (request.params && request.params.id && objectIdRegex.test(request.params.id)) {
      await ClientController.find(request, reply, {
        user,
        id: request.params.id,
      }).then(data => {
        // Pass client data along.
        client = data;
        // Assemble form identifiers that we'll hash. Form submission handler
        // will verify this hash before writing to DB, to ensure there's no
        // way to edit a different client from this form.
        formHash = formHashContents(client._id);
      }).catch(err => {
        client = {};
        alert = {
          type: 'error',
          message: '<p>The OAuth client could not be found.</p>',
        };
      });
    } else {
      client = {};
      alert = {
        type: 'warning',
        message: '<p>The OAuth Client id in the URL seems malformed</p>',
      };
    }

    // Display page to user.
    return reply.view('admin-client', {
      user,
      alert,
      client,
      formHash,
    });
  },

  /**
   * Admin: OAuth Client form submission handler
   */
  async adminOauthClientEditSubmit(request, reply) {
    // Load user cookie. Redirect to homepage when no cookie found.
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }

    // Set up our validation.
    let alert = {};
    let reasons = [];
    let destination = '/admin';

    try {
      // First, validate form integrity
      if (request.payload && request.payload.db_id && request.payload.client_id && request.payload.form_hash) {
        const submissionHash = formHashContents(request.payload.db_id);
        if (request.payload.form_hash !== submissionHash) {
          alert.type = 'error';
          reasons.push(`The form was tampered with. Rejecting your edits to OAuth Client <strong>${ request.payload.client_name }</strong>.`);
        }
      }

      // Now validate the rest of the input...

      // Do we have validation problems?
      if (reasons.length > 0) {
        alert.type = alert.type === 'error' ? 'error' : 'warning';
        alert.message = `<p>${ reasons.join('</p><p>') }</p>`;
      } else {
        // Write to DB.
        // Display success to admin.
        alert.type = 'status';
        alert.message = `<p>OAuth Client <strong>${ request.payload.client_name }</strong> was updated successfully.</p>`;
      }
    } catch (err) {
      console.log('🔥', err);
    }

    // Finalize cookie (feedback, TOTP status, etc.)
    cookie.alert = alert;
    request.yar.set('session', cookie);

    // Always redirect, to avoid resubmitting when user refreshes browser.
    return reply.redirect(destination);
  },
};
