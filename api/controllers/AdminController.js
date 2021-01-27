const Boom = require('@hapi/boom');
const Recaptcha = require('recaptcha2');
const Client = require('../models/Client');
const User = require('../models/User');
const EmailService = require('../services/EmailService');
const HelperService = require('../services/HelperService');
const ClientController = require('./ClientController');
const TOTPController = require('./TOTPController');
const UserController = require('./UserController');
const AuthPolicy = require('../policies/AuthPolicy');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

module.exports = {

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
      logger.error(
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
  }
};
