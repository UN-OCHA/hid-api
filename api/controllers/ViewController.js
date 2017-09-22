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
    const session = request.yar.get('session');
    if (session) { // User is already logged in
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
    reply.view('new_password', {
      query: request.query
    });
  }

  newPasswordPost (request, reply) {
    const UserController = this.app.controllers.UserController;
    const that = this;
    UserController.resetPasswordEndpoint(request, function (result) {
      // Missing totp code
      if (result.isBoom &&
        result.output.headers &&
        result.output.headers['WWW-Authenticate'] &&
        result.output.headers['WWW-Authenticate'].indexOf('totp') !== -1) {
        let alert = false;
        if (result.output.payload.message !== 'No TOTP token') {
          alert = {
            type: 'danger',
            message: result.output.payload.message
          };
        }
        return reply.view('totp', {
          title: 'Enter your TOTP code',
          query: request.payload,
          alert: alert
        });
      }
      else {
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
      }
    });
  }

  // Display a default user page when user is logged in without OAuth
  user (request, reply) {
    // If the user is not authenticated, redirect to the login page
    const User = this.app.orm.User;
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId)) {
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
