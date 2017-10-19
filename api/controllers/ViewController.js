'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');

module.exports = class ViewController extends Controller {

  _getAlert(result, success, error) {
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

  _getRegisterLink(args) {
    const params = this.app.services.HelperService.getOauthParams(args);
    let registerLink = '/register';
    if (params) {
      registerLink += '?' + params;
    }
    return registerLink;
  }

  _getPasswordLink(args) {
    const params = this.app.services.HelperService.getOauthParams(args);
    let registerLink = '/password';
    if (params) {
      registerLink += '?' + params;
    }
    return registerLink;
  }

  login (request, reply) {
    const Client = this.app.orm.Client;
    const cookie = request.yar.get('session');

    if (!cookie || (cookie && !cookie.userId)) {
      // Show the login form
      const registerLink = this._getRegisterLink(request.query);
      const passwordLink = this._getPasswordLink(request.query);
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
  }

  logout (request, reply) {
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
      const Client = this.app.orm.Client;
      const regex = new RegExp(hostname, 'i');
      const that = this;
      Client
        .count({redirectUri: regex})
        .then(count => {
          if (count > 0) {
            return reply.redirect(request.query.redirect);
          }
          else {
            that.log.warn('Redirecting to ' + request.query.redirect + ' is not allowed', { security: true, fail: true, request: request});
            return reply.redirect('/');
          }
        })
        .catch(err => {
          that.log.error('Error logging user out', {request: request, error: err});
          return reply.redirect('/');
        });
    }
    else {
      return reply.redirect('/');
    }
  }

  _buildRequestUrl (request, url) {
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
  }

  register (request, reply) {
    const requestUrl = this._buildRequestUrl(request, 'verify2');
    reply.view('register', {
      title: 'Register in Humanitarian ID',
      requestUrl: requestUrl
    });
  }

  registerPost (request, reply) {
    const UserController = this.app.controllers.UserController;
    const that = this;
    UserController.create(request, function (result) {
      const al = that._getAlert(result,
        'You registered successfully. Please confirm your email address',
        'There was an error registering you.'
      );
      const registerLink = that._getRegisterLink(request.payload);
      const passwordLink = that._getPasswordLink(request.payload);
      return reply.view('login', {
        alert: al,
        query: request.query,
        registerLink: registerLink,
        passwordLink: passwordLink
      });
    });
  }

  verify (request, reply) {
    const UserController = this.app.controllers.UserController;
    if (!request.query.hash) {
      return reply(Boom.badRequest('Missing hash parameter'));
    }
    request.payload = { hash: request.query.hash };
    const that = this;
    UserController.validateEmail(request, function (result) {
      const al = that._getAlert(
        result,
        'Thank you for confirming your email address. You can now log in',
        'There was an error confirming your email address.'
      );
      const registerLink = that._getRegisterLink(request.query);
      const passwordLink = that._getPasswordLink(request.query);
      return reply.view('login', {
        alert: al,
        query: request.query,
        registerLink: registerLink,
        passwordLink: passwordLink
      });
    });
  }

  password (request, reply) {
    const requestUrl = this._buildRequestUrl(request, 'new_password');
    reply.view('password', {
      requestUrl: requestUrl
    });
  }

  passwordPost (request, reply) {
    const UserController = this.app.controllers.UserController;
    const that = this;
    UserController.resetPasswordEndpoint(request, function (result) {
      const al = that._getAlert(
        result,
        'You should have received an email which will allow you to reset your password.',
        'There was an error resetting your password.'
      );
      const registerLink = that._getRegisterLink(request.payload);
      const passwordLink = that._getPasswordLink(request.payload);
      return reply.view('login', {
        alert: al,
        query: request.query,
        registerLink: registerLink,
        passwordLink: passwordLink
      });
    });
  }

  newPassword (request, reply) {
    const that = this;
    const User = this.app.orm.User;
    request.yar.reset();
    request.yar.set('session', { hash: request.query.hash, totp: false});
    User
      .findOne(({hash: request.query.hash, hashAction: 'reset_password'}))
      .then(user => {
        if (user.totp) {
          return reply.view('totp', {
            query: request.query,
            destination: '/new_password',
            alert: false
          });
        }
        else {
          request.yar.set('session', { hash: request.query.hash, totp: true });
          return reply.view('new_password', {
            query: request.query,
            hash: request.query.hash
          });
        }
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  newPasswordPost (request, reply) {
    const UserController = this.app.controllers.UserController;
    const User = this.app.orm.User;
    const that = this;
    const cookie = request.yar.get('session');
    const authPolicy = this.app.policies.AuthPolicy;

    if (cookie && cookie.hash && !cookie.totp) {
      User
        .findOne(({hash: cookie.hash, hashAction: 'reset_password'}))
        .then(user => {
          const token = request.payload['x-hid-totp'];
          return authPolicy.isTOTPValid(user, token);
        })
        .then((user) => {
          cookie.totp = true;
          request.yar.set('session', cookie);
          return reply.view('new_password', {
            query: request.payload,
            hash: cookie.hash
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
        const al = that._getAlert(result,
          'Your password was successfully reset. You can now login.',
          'There was an error resetting your password.'
        );
        const registerLink = that._getRegisterLink(request.payload);
        const passwordLink = that._getPasswordLink(request.payload);
        return reply.view('login', {
          alert: al,
          query: request.payload,
          registerLink: registerLink,
          passwordLink: passwordLink
        });
      }, false);
    }
  }

  // Display a default user page when user is logged in without OAuth
  user (request, reply) {
    // If the user is not authenticated, redirect to the login page
    const User = this.app.orm.User;
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId) || (cookie && !cookie.totp)) {
      return reply.redirect('/');
    }
    else {
      const that = this;
      User
        .findOne({_id: cookie.userId})
        .then(user => {
          return reply.view('user', {
            user: user
          });
        })
        .catch(err => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
  }
};
