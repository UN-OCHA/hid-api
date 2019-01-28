'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const Recaptcha = require('recaptcha2');
const Client = require('../models/Client');
const User = require('../models/User');
const HelperService = require('../services/HelperService');
const ErrorService = require('../services/ErrorService');
const UserController = require('./UserController');
const AuthPolicy = require('../policies/AuthPolicy');
const config = require('../../config/env')[process.env.NODE_ENV];
const logger = config.logger;

function _getAlert (result, success, error) {
  if (!result || !result.isBoom) {
    return {
      type: 'success',
      message: success
    };
  }
  else {
    return {
      type: 'danger',
      message: error
    };
  }
}

function _getRegisterLink(args) {
  const params = HelperService.getOauthParams(args);
  let registerLink = '/register';
  if (params) {
    registerLink += '?' + params;
  }
  return registerLink;
}

function _getPasswordLink (args) {
  const params = HelperService.getOauthParams(args);
  let registerLink = '/password';
  if (params) {
    registerLink += '?' + params;
  }
  return registerLink;
}

function _buildRequestUrl (request, url) {
  let requestUrl = 'https://' + request.info.host + '/' + url;
  if (request.query.client_id) {
    requestUrl += '?client_id=' + request.query.client_id;
  }
  if (request.query.redirect_uri) {
    requestUrl += '&redirect_uri=' + request.query.redirect_uri;
  }
  if (request.query.response_type) {
    requestUrl += '&response_type=' + request.query.response_type;
  }
  if (request.query.scope) {
    requestUrl += '&scope=' + request.query.scope;
  }
  return requestUrl;
},

module.exports = {

  login: function (request, reply) {
    const cookie = request.yar.get('session');

    if (!cookie || (cookie && !cookie.userId)) {
      // Show the login form
      const registerLink = _getRegisterLink(request.query);
      const passwordLink = _getPasswordLink(request.query);
      const loginArgs = {
        title: 'Log into Humanitarian ID',
        query: request.query,
        registerLink: registerLink,
        passwordLink: passwordLink,
        alert: false
      };

      // Check client ID and redirect URI at this stage, so we can send an error message if needed.
      if (request.query.client_id) {
        Client
          .findOne({id: request.query.client_id})
          .then(client => {
            if (!client || (client && client.redirectUri !== request.query.redirect_uri)) {
              loginArgs.alert = {
                type: 'danger',
                message: 'The configuration of the client application is invalid. We can not log you in.'
              };
              return reply.view('login', loginArgs);
            }
            return reply.view('login', loginArgs);
          })
          .catch(err => {
            loginArgs.alert = {
              type: 'danger',
              message: 'Internal server error. We can not log you in. Please let us know at info@humanitarian.id'
            };
            return reply.view('login', loginArgs);
          });
      }
      else {
        return reply.view('login', loginArgs);
      }
    }

    if (cookie && cookie.userId && cookie.totp === true) { // User is already logged in
      if (request.query.client_id &&
        request.query.redirect_uri &&
        request.query.response_type &&
        request.query.scope) {
        // Redirect to /oauth/authorize
        let redirect = request.query.redirect || '/oauth/authorize';
        redirect += '?client_id=' + request.query.client_id;
        redirect += '&redirect_uri=' + request.query.redirect_uri;
        redirect += '&response_type=' + request.query.response_type;
        if (request.query.state) {
          redirect += '&state=' + request.query.state;
        }
        redirect += '&scope=' + request.query.scope;

        return reply.redirect(redirect);
      }
      else {
        // User is already logged in
        return reply.redirect('/user');
      }
    }

    if (cookie && cookie.userId && cookie.totp === false) {
      // Show TOTP form
      return reply.view('totp', {
        title: 'Enter your Authentication code',
        query: request.query,
        destination: '/login',
        alert: false
      });
    }
  },

  logout: function (request, reply) {
    request.yar.reset();
    if (request.query.redirect) {
      // Validate redirect URL
      const url = request.query.redirect;
      let hostname;
      if (url.indexOf('://') > -1) {
        hostname = url.split('/')[2];
      }
      else {
        hostname = url.split('/')[0];
      }
      //find & remove port number
      hostname = hostname.split(':')[0];
      //find & remove "?"
      hostname = hostname.split('?')[0];
      const regex = new RegExp(hostname, 'i');
      Client
        .count({redirectUri: regex})
        .then(count => {
          if (count > 0) {
            return reply.redirect(request.query.redirect);
          }
          else {
            logger.warn('Redirecting to ' + request.query.redirect + ' is not allowed', { security: true, fail: true, request: request});
            return reply.redirect('/');
          }
        })
        .catch(err => {
          logger.error('Error logging user out', {request: request, error: err});
          return reply.redirect('/');
        });
    }
    else {
      return reply.redirect('/');
    }
  },

  register: function (request, reply) {
    const requestUrl = _buildRequestUrl(request, 'verify2');
    reply.view('register', {
      title: 'Register in Humanitarian ID',
      requestUrl: requestUrl,
      recaptcha_site_key: process.env.RECAPTCHA_PUBLIC_KEY
    });
  },

  registerPost: function (request, reply) {
    // Check recaptcha
    const recaptcha = new Recaptcha({siteKey: process.env.RECAPTCHA_PUBLIC_KEY, secretKey: process.env.RECAPTCHA_PRIVATE_KEY});
    const registerLink = _getRegisterLink(request.payload);
    const passwordLink = _getPasswordLink(request.payload);
    recaptcha
      .validate(request.payload['g-recaptcha-response'])
      .then(() => {
        UserController.create(request, function (result) {
          const al = _getAlert(result,
            'Thank you for creating an account. You will soon receive a confirmation email to confirm your account.',
            'There is an error in your registration. You may have already registered. If so, simply reset your password at https://auth.humanitarian.id/password.'
          );
          reply.view('login', {
            alert: al,
            query: request.query,
            registerLink: registerLink,
            passwordLink: passwordLink
          });
        });
      })
      .catch((err) => {
        reply.view('login', {
          alert: {type: 'danger', message: recaptcha.translateErrors(err)},
          query: request.query,
          registerLink: registerLink,
          passwordLink: passwordLink
        });
      });
  },

  verify: function (request, reply) {
    if (!request.query.hash && !request.query.email && !request.query.time) {
      return reply(Boom.badRequest('Missing hash parameter'));
    }
    request.payload = { hash: request.query.hash, email: request.query.email, time: request.query.time };
    const that = this;
    UserController.validateEmail(request, function (result) {
      const al = _getAlert(
        result,
        'Thank you for confirming your email address. You can now log in',
        'There was an error confirming your email address.'
      );
      const registerLink = _getRegisterLink(request.query);
      const passwordLink = _getPasswordLink(request.query);
      return reply.view('login', {
        alert: al,
        query: request.query,
        registerLink: registerLink,
        passwordLink: passwordLink
      });
    });
  },

  password: function (request, reply) {
    const requestUrl = _buildRequestUrl(request, 'new_password');
    reply.view('password', {
      requestUrl: requestUrl
    });
  },

  passwordPost: function (request, reply) {
    const that = this;
    UserController.resetPasswordEndpoint(request, function (result) {
      const al = _getAlert(
        result,
        'Password reset was sent to ' + request.payload.email + '. Please make sure the email address is correct. If not, please reset your password again.',
        'There was an error resetting your password.'
      );
      const registerLink = _getRegisterLink(request.payload);
      const passwordLink = _getPasswordLink(request.payload);
      return reply.view('login', {
        alert: al,
        query: request.query,
        registerLink: registerLink,
        passwordLink: passwordLink
      });
    });
  },

  newPassword: function (request, reply) {
    const that = this;
    request.yar.reset();
    request.yar.set('session', { hash: request.query.hash, id: request.query.id, time: request.query.time, totp: false});
    User
      .findOne({_id: request.query.id})
      .then(user => {
        if (!user) {
          return reply.view('error');
        }
        if (user.totp) {
          return reply.view('totp', {
            query: request.query,
            destination: '/new_password',
            alert: false
          });
        }
        else {
          request.yar.set('session', { hash: request.query.hash, id: request.query.id, time: request.query.time, totp: true });
          return reply.view('new_password', {
            query: request.query,
            hash: request.query.hash,
            id: request.query.id,
            time: request.query.time
          });
        }
      })
      .catch(err => {
        ErrorService.handle(err, request, reply);
      });
  },

  newPasswordPost: function (request, reply) {
    const cookie = request.yar.get('session');

    if (cookie && cookie.hash && cookie.id && cookie.time && !cookie.totp) {
      User
        .findOne({_id: cookie.id})
        .then(user => {
          const token = request.payload['x-hid-totp'];
          return AuthPolicy.isTOTPValid(user, token);
        })
        .then((user) => {
          cookie.totp = true;
          request.yar.set('session', cookie);
          return reply.view('new_password', {
            query: request.payload,
            hash: cookie.hash,
            id: cookie.id,
            time: cookie.time
          });
        })
        .catch(err => {
          const alert =  {
            type: 'danger',
            message: err.output.payload.message
          };
          return reply.view('totp', {
            query: request.payload,
            destination: '/new_password',
            alert: alert
          });
        });
    }

    if (cookie && cookie.hash && cookie.totp) {
      UserController.resetPassword(request, function (result) {
        const params = HelperService.getOauthParams(request.payload);
        if (params) {
          const al = _getAlert(result,
            'Your password was successfully reset. You can now login.',
            'There was an error resetting your password.'
          );
          const registerLink = _getRegisterLink(request.payload);
          const passwordLink = _getPasswordLink(request.payload);
          return reply.view('login', {
            alert: al,
            query: request.payload,
            registerLink: registerLink,
            passwordLink: passwordLink
          });
        }
        else {
          const al = _getAlert(result,
            'Thank you for updating your password.',
            'There was an error resetting your password.'
          );
          return reply.view('message', {
            alert: al,
            query: request.payload,
            isSuccess: !result.isBoom,
            title: 'Password update'
          });
        }
      }, false);
    }
  },

  // Display a default user page when user is logged in without OAuth
  user: function (request, reply) {
    // If the user is not authenticated, redirect to the login page
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }
    else {
      User
        .findOne({_id: cookie.userId})
        .then(user => {
          return reply.view('user', {
            user: user
          });
        })
        .catch(err => {
          ErrorService.handle(err, request, reply);
        });
    }
  }
};
