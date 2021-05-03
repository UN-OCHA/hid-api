/**
 * @module AdminController
 * @description Controller for pages that only admins see.
 */
const crypto = require('crypto');

const User = require('../models/User');
const ClientController = require('./ClientController');
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
    const options = {
      limit: 10000,
    };
    const criteria = {};
    const clientResponse = await ClientController.find(request, reply, {
      user,
      options,
      criteria,
    });

    // Extract clients and sort alphabetically with case-insensitivity
    const clients = clientResponse.source;
    clients.sort((a, b) => a.name.localeCompare(b.name, {
      sensitivity: 'base',
    }));

    // Check for user feedback to display.
    let alert;
    if (cookie.alert) {
      alert = cookie.alert;
      delete cookie.alert;
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
      }).then((data) => {
        // Pass client data along.
        client = data;

        // Assemble form identifiers that we'll hash. Form submission handler
        // will verify this hash before writing to DB, to ensure there's no
        // way to edit a different client from this form.
        formHash = formHashContents(client._id);
      }).catch(() => {
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

    // Check for feedback from form submissions. If this exists, the errors
    // above are unlikely to have occurred so we're overwriting.
    if (cookie.alert) {
      alert = cookie.alert;
      delete cookie.alert;
      request.yar.set('session', cookie);
    }

    // Options for Environment dropdown
    const environments = ['Production', 'Staging', 'Development', 'Local'];

    // Display page to user.
    return reply.view('admin-client', {
      user,
      alert,
      client,
      formHash,
      environments,
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
    const alert = {};
    const reasons = [];
    let destination = '/admin';

    try {
      // Do we have a form submission?
      if (!request.payload) {
        throw Error('User feedback:Form submission was not present.');
      }

      // Validate form integrity
      if (request.payload.db_id && request.payload.client_id && request.payload.form_hash) {
        const submissionHash = formHashContents(request.payload.db_id);
        if (request.payload.form_hash !== submissionHash) {
          throw Error(`User feedback:The form was tampered with. Rejecting your edits to OAuth Client <strong>${request.payload.client_name}</strong>.`);
        }
      }

      // Validate Client Name
      if (!request.payload.client_name) {
        reasons.push('There must be a Client Name. HID users see this name when authorizing the website.');
      }

      // Validate Client ID
      if (!request.payload.client_id || !request.payload.client_id.match(/[a-zA-z-]/)) {
        reasons.push('There must be a Client ID (alpha with dashes)');
      }

      // Validate redirect_uri. This simply checks whether it is a valid URL, not
      // whether it exists or is actually going to work.
      if (!request.payload.client_redirect_uri) {
        reasons.push('There must be a primary redirect URI. If you are updating an existing client just move the alternate URL into the Redirect URI field.');
      }

      // Validate Client Secret.
      if (!request.payload.client_secret) {
        reasons.push('There must be a Client Secret. Best to use a password manager to generate a strong, unique secret for each OAuth Client.');
      }

      // Do we have validation problems?
      if (reasons.length > 0) {
        // Display user feedback.
        alert.type = 'warning';
        alert.message = `<p>${reasons.join('</p><p>')}</p>`;

        // Set destination to be edit form.
        destination = `/admin/client/${request.payload.db_id}`;
      } else {
        // Validation passed. Write to DB.
        await ClientController.update(request, {
          clientId: request.payload.db_id,
          clientData: {
            id: request.payload.client_id,
            name: request.payload.client_name,
            secret: request.payload.client_secret,
            redirectUri: request.payload.client_redirect_uri,
            redirectUrls: request.payload.client_redirect_urls ? request.payload.client_redirect_urls.split('\r\n') : [],
            description: request.payload.client_description,
            organization: request.payload.client_organization,
            environment: request.payload.client_environment,
          },
        }).then(() => {
          // Display success to admin.
          alert.type = 'status';
          alert.message = `<p>OAuth Client <strong>${request.payload.client_name}</strong> was updated successfully.</p>`;
        }).catch((err) => {
          // Mongo validation error.
          if (err.message && err.message.indexOf('Client validation failed: ') !== -1) {
            throw Error(`User feedback: ${err.message.replace('Client validation failed: ', '')}`);
          } else if (err.message && err.message.indexOf('duplicate key')) {
            // Another type of Mongo error.
            throw Error(`User feedback:The Client ID <strong>${request.payload.client_id}</strong> is already present in the DB. Please pick another one.`);
          } else {
            // We don't know what error this is. Pass it along.
            throw err;
          }
        });
      }
    } catch (err) {
      // Check and see if this is user feedback.
      if (err.message && err.message.indexOf('User feedback:') !== -1) {
        alert.type = 'error';
        alert.message = err.message.split('User feedback:')[1];
        destination = `/admin/client/${request.payload.db_id}`;
      } else {
        alert.type = 'error';
        alert.message = 'The OAuth Client could not be saved due to an internal server error. Check Kibana for details.';

        // It seems like we caught a genuine error. Log it.
        logger.error(
          `[AdminController->adminOauthClientEditSubmit] ${err.message}`,
          {
            request,
            fail: true,
          },
        );
      }
    }

    // Finalize cookie (feedback, form data, etc.)
    cookie.alert = alert;
    request.yar.set('session', cookie);

    // Always redirect, to avoid resubmitting when user refreshes browser.
    return reply.redirect(destination);
  },
};
