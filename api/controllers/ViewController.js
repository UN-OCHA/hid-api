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

  login (request, reply) {
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
    }

    let params = '';
    if (request.query.redirect) {
      params += 'redirect=' + request.query.redirect;
    }
    if (request.query.client_id) {
      params += '&client_id=' + request.query.client_id;
    }
    if (request.query.redirect_uri) {
      params += '&redirect_uri=' + request.query.redirect_uri;
    }
    if (request.query.response_type) {
      params += '&response_type=' + request.query.response_type;
    }
    if (request.query.scope) {
      params += '&scope=' + request.query.scope;
    }

    let registerLink = '/register';
    if (params) {
      registerLink += '?' + params;
    }

    let passwordLink = '/password';
    if (params) {
      passwordLink += '?' + params;
    }

    return reply.view('login', {
      title: 'Log into Humanitarian ID',
      query: request.query,
      registerLink: registerLink,
      passwordLink: passwordLink,
      alert: false
    });
  }

  logout (request, reply) {
    request.yar.reset();
    return reply.redirect('/');
  }

  register (request, reply) {
    const requestUrl = request.connection.info.protocol + '://' + request.info.host +
      '/verify?client_id=' + request.query.client_id +
      '&redirect_uri=' + request.query.redirect_uri +
      '&response_type=' + request.query.response_type +
      '&scope=' + request.query.scope;
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
      return reply.view('login', {
        alert: al,
        query: request.query
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
      return reply.view('login', {
        alert: al,
        query: request.query
      });
    });
  }

  password (request, reply) {
    const requestUrl = request.connection.info.protocol + '://' + request.info.host +
      '/new_password?client_id=' + request.query.client_id +
      '&redirect_uri=' + request.query.redirect_uri +
      '&response_type=' + request.query.response_type +
      '&scope=' + request.query.scope;
    reply.view('password', {
      requestUrl: requestUrl
    });
  }

  passwordPost (request, reply) {
    const UserController = this.app.controllers.UserController;
    const that = this;
    UserController.resetPassword(request, function (result) {
      const al = that._getAlert(
        result,
        'You should have received an email which will allow you to reset your password.',
        'There was an error resetting your password.'
      );
      return reply.view('login', {
        alert: al,
        query: request.query
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
    UserController.resetPassword(request, function (result) {
      const al = that._getAlert(result,
        'Your password was successfully reset.',
        'There was an error resetting your password.'
      );
      return reply.view('login', {
        alert: al,
        query: request.payload
      });
    });
  }
};
