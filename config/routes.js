/**
 * Routes Configuration
 * (trails.config.routes)
 *
 * Configure how routes map to views and controllers.
 *
 * @see http://trailsjs.io/doc/config/routes.js
 */

'use strict';

module.exports = [

  /**
   * Render the login view
   */
  {
    method: 'GET',
    path: '/',
    handler: 'ViewController.login'
  },

  {
    method: 'GET',
    path: '/register',
    handler: 'ViewController.register'
  },

  {
    method: 'POST',
    path: '/register',
    handler: 'ViewController.registerPost'
  },

  {
    method: 'GET',
    path: '/verify',
    handler: 'ViewController.verify'
  },

  {
    method: 'GET',
    path: '/logout',
    handler: 'ViewController.logout'
  },

  {
    method: 'GET',
    path: '/password',
    handler: 'ViewController.password'
  },

  {
    method: 'POST',
    path: '/password',
    handler: 'ViewController.passwordPost'
  },

  {
    method: 'GET',
    path: '/new_password',
    handler: 'ViewController.newPassword'
  },

  {
    method: 'POST',
    path: '/new_password',
    handler: 'ViewController.newPasswordPost'
  },

  /**
   * Constrain the DefaultController.info handler to accept only GET requests.
   */
  {
    method: 'GET',
    path: '/api/v2/default/info',
    handler: 'DefaultController.info'
  },

  /**
   * Default authentication path.
   */
  {
    method: 'GET',
    path: '/.well-known/openid-configuration',
    handler: 'AuthController.openIdConfiguration'
  },

  {
    method: 'GET',
    path: '/oauth/jwks',
    handler: 'AuthController.jwks'
  },

  {
    method: 'POST',
    path: '/api/v2/jsonwebtoken',
    handler: 'AuthController.authenticate'
  },

  {
    method: 'POST',
    path: '/login',
    handler: 'AuthController.login'
  },

  {
    method: 'GET',
    path: '/oauth/authorize',
    handler: 'AuthController.authorizeDialogOauth2'
  },

  {
    method: 'POST',
    path: '/oauth/authorize',
    handler: 'AuthController.authorizeOauth2'
  },

  {
    method: ['GET', 'POST'],
    path: '/oauth/access_token',
    handler: 'AuthController.accessTokenOauth2'
  },

  {
    method: ['GET', 'POST'],
    path: '/account.json',
    handler: 'UserController.showAccount'
  },

  {
    method: 'POST',
    path: '/api/v2/user',
    handler: 'UserController.create'
  },

  {
    method: 'GET',
    path: '/api/v2/user/{id?}',
    handler: 'UserController.find'
  },

  {
    method: [ 'PUT', 'PATCH' ],
    path: '/api/v2/user/{id}',
    handler: 'UserController.update'
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}',
    handler: 'UserController.destroy'
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/notification',
    handler: 'UserController.notify'
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/{childAttribute}',
    handler: 'UserController.checkin'
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    handler: 'UserController.checkout'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/password',
    handler: 'UserController.resetPassword'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/orphan',
    handler: 'UserController.claimEmail'
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/picture',
    handler: 'UserController.updatePicture',
    config: {
      payload: {
        output: 'stream',
        parse: true,
        allow: 'multipart/form-data'
      }
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/emails',
    handler: 'UserController.addEmail'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/email',
    handler: 'UserController.setPrimaryEmail'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/emails/{email?}',
    handler: 'UserController.validateEmail'
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/emails/{email}',
    handler: 'UserController.dropEmail'
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/phone_numbers',
    handler: 'UserController.addPhone'
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/phone_numbers/{pid}',
    handler: 'UserController.dropPhone'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/phone_number',
    handler: 'UserController.setPrimaryPhone'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/organization',
    handler: 'UserController.setPrimaryOrganization'
  },

  {
    method: 'POST',
    path: '/api/v2/list',
    handler: 'ListController.create'
  },

  {
    method: 'GET',
    path: '/api/v2/list/{id?}',
    handler: 'ListController.find'
  },

  {
    method: [ 'PUT', 'PATCH' ],
    path: '/api/v2/list/{id}',
    handler: 'ListController.update'
  },

  {
    method: 'DELETE',
    path: '/api/v2/list/{id}',
    handler: 'ListController.destroy'
  },

  {
    method: 'POST',
    path: '/api/v2/client',
    handler: 'ClientController.create'
  },

  {
    method: 'GET',
    path: '/api/v2/client/{id?}',
    handler: 'ClientController.find'
  },

  {
    method: [ 'PUT', 'PATCH' ],
    path: '/api/v2/client/{id}',
    handler: 'ClientController.update'
  },

  {
    method: 'DELETE',
    path: '/api/v2/client/{id}',
    handler: 'ClientController.destroy'
  },

  {
    method: 'GET',
    path: '/api/v2/notification/{id?}',
    handler: 'NotificationController.find'
  },

  {
    method: 'PUT',
    path: '/api/v2/notification/{id}',
    handler: 'NotificationController.read'
  }
];
