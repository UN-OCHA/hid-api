/**
 * Routes Configuration
 * (trails.config.routes)
 *
 * Configure how routes map to views and controllers.
 *
 * @see http://trailsjs.io/doc/config/routes.js
 */

'use strict';

const ViewController = require('../api/controllers/ViewController');
const WebhooksController = require('../api/controllers/WebhooksController');
const WebhooksPolicy = require('../api/policies/WebhooksPolicy');
const CronController = require('../api/controllers/CronController');
const CronPolicy = require('../api/policies/CronPolicy');
const ServiceCredentialsController = require('../api/controllers/ServiceCredentialsController');
const AuthPolicy = require('../api/policies/AuthPolicy');
const OutlookController = require('../api/controllers/OutlookController');
const NotificationController = require('../api/controllers/NotificationController');
const ClientController = require('../api/controllers/ClientController');
const TrustedDomainController = require('../api/controllers/TrustedDomainController');
const GSSSyncController = require('../api/controllers/GSSSyncController');
const GSSSyncPolicy = require('../api/policies/GSSSyncPolicy');
const ListController = require('../api/controllers/ListController');
const ListPolicy = require('../api/policies/ListPolicy');
const OperationController = require('../api/controllers/OperationController');
const OperationsPolicy = require('../api/policies/OperationsPolicy');
const ListUserController = require('../api/controllers/ListUserController');
const ListUserPolicy = require('../api/policies/ListUserPolicy');
const ServiceController = require('../api/controllers/ServiceController');
const ServicePolicy = require('../api/policies/ServicePolicy');
const NumbersController = require('../api/controllers/NumbersController');
const TOTPController = require('../api/controllers/TOTPController');
const UserController = require('../api/controllers/UserController');
const UserPolicy = require('../api/policies/UserPolicy');
const AuthController = require('../api/controllers/AuthController');

module.exports = [

  /**
   * Render the login view
   */
  {
    method: 'GET',
    path: '/',
    handler: ViewController.login
  },

  {
    method: 'GET',
    path: '/register',
    handler: ViewController.register
  },

  {
    method: 'POST',
    path: '/register',
    handler: ViewController.registerPost
  },

  {
    method: 'GET',
    path: '/verify',
    handler: ViewController.newPassword
  },

  {
    method: 'GET',
    path: '/verify2',
    handler: ViewController.verify
  },

  {
    method: 'GET',
    path: '/logout',
    handler: ViewController.logout
  },

  {
    method: 'GET',
    path: '/password',
    handler: ViewController.password
  },

  {
    method: 'POST',
    path: '/password',
    handler: ViewController.passwordPost
  },

  {
    method: 'GET',
    path: '/new_password',
    handler: ViewController.newPassword
  },

  {
    method: 'POST',
    path: '/new_password',
    handler: ViewController.newPasswordPost
  },

  {
    method: 'GET',
    path: '/user',
    handler: ViewController.user
  },

  {
    method: 'GET',
    path: '/docs/{param*}',
    handler: {
      directory: {
        path: 'docs'
      }
    }
  },

  /**
   * Default authentication path.
   */
  {
    method: 'GET',
    path: '/.well-known/openid-configuration',
    handler: AuthController.openIdConfiguration
  },

  {
    method: 'GET',
    path: '/oauth/jwks',
    handler: AuthController.jwks
  },

  {
    method: 'GET',
    path: '/api/v2/updatelistusers',
    handler: ListUserController.updateListUsers
  },

  {
    method: 'POST',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.authenticate
  },

  {
    method: 'POST',
    path: '/login',
    handler: AuthController.login
  },

  {
    method: 'GET',
    path: '/oauth/authorize',
    handler: AuthController.authorizeDialogOauth2
  },

  {
    method: 'POST',
    path: '/oauth/authorize',
    handler: AuthController.authorizeOauth2
  },

  {
    method: ['GET', 'POST'],
    path: '/oauth/access_token',
    handler: AuthController.accessTokenOauth2
  },

  {
    method: 'GET',
    path: '/api/v2/numbers',
    handler: NumbersController.numbers
  },

  {
    method: 'PUT',
    path: '/api/v2/user/password',
    handler: UserController.resetPasswordEndpoint
  },

  {
    method: 'PUT',
    path: '/api/v2/user/emails/{email?}',
    handler: UserController.validateEmail
  },

  {
    method: 'POST',
    path: '/api/v2/webhooks/hrinfo',
    config: {
      pre: [
        WebhooksPolicy.canRun
      ],
      handler: WebhooksController.hrinfo
    }
  }
];
