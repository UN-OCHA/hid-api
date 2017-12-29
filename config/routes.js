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
    handler: 'ViewController.newPassword'
  },

  {
    method: 'GET',
    path: '/verify2',
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

  {
    method: 'GET',
    path: '/user',
    handler: 'ViewController.user'
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
    handler: 'AuthController.openIdConfiguration'
  },

  {
    method: 'GET',
    path: '/oauth/jwks',
    handler: 'AuthController.jwks'
  },

  {
    method: 'GET',
    path: '/api/v2/updatelistusers',
    handler: 'ListUserController.updateListUsers'
  },

  {
    method: 'POST',
    path: '/api/v2/jsonwebtoken',
    handler: 'AuthController.authenticate'
  },

  {
    method: 'GET',
    path: '/api/v2/jsonwebtoken',
    handler: 'AuthController.jwtTokens'
  },

  {
    method: 'DELETE',
    path: '/api/v2/jsonwebtoken',
    handler: 'AuthController.blacklistJwt'
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
    method: 'GET',
    path: '/api/v2/numbers',
    handler: 'NumbersController.numbers'
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
    method: 'GET',
    path: '/api/v2/user.{extension}',
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
    handler: 'ListUserController.checkin'
  },

  {
    method: ['PUT', 'PATCH'],
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    handler: 'ListUserController.update'
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    handler: 'ListUserController.checkout'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/password',
    handler: 'UserController.resetPasswordEndpoint'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/password',
    handler: 'UserController.updatePassword'
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
        output: 'data',
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
    path: '/api/v2/user/{id}/connections',
    handler: 'UserController.addConnection'
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/connections/{cid}',
    handler: 'UserController.updateConnection'
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/connections/{cid}',
    handler: 'UserController.deleteConnection'
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/subscriptions',
    handler: 'ServiceController.subscribe'
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/subscriptions/{serviceId}',
    handler: 'ServiceController.unsubscribe'
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/googlecredentials',
    handler: 'GSSSyncController.saveGoogleCredentials'
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
    method: 'PUT',
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
    method: 'PUT',
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
    path: '/api/v2/notification/{id?}',
    handler: 'NotificationController.update'
  },

  {
    method: 'POST',
    path: '/api/v2/service',
    handler: 'ServiceController.create'
  },

  {
    method: 'GET',
    path: '/api/v2/service/{id?}',
    handler: 'ServiceController.find'
  },

  {
    method: 'GET',
    path: '/api/v2/service/mailchimp/lists',
    handler: 'ServiceController.mailchimpLists'
  },

  {
    method: 'GET',
    path: '/api/v2/service/google/groups',
    handler: 'ServiceController.googleGroups'
  },

  {
    method: 'GET',
    path: '/api/v2/servicecredentials',
    handler: 'ServiceCredentialsController.find'
  },

  {
    method: [ 'PUT', 'PATCH' ],
    path: '/api/v2/service/{id}',
    handler: 'ServiceController.update'
  },

  {
    method: 'DELETE',
    path: '/api/v2/service/{id}',
    handler: 'ServiceController.destroy'
  },

  {
    method: 'POST',
    path: '/api/v2/totp/qrcode',
    handler: 'TOTPController.generateQRCode'
  },

  {
    method: 'POST',
    path: '/api/v2/totp/codes',
    handler: 'TOTPController.generateBackupCodes'
  },

  {
    method: 'POST',
    path: '/api/v2/totp/device',
    handler: 'TOTPController.saveDevice'
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp/device/{id}',
    handler: 'TOTPController.destroyDevice'
  },

  {
    method: 'POST',
    path: '/api/v2/totp',
    handler: 'TOTPController.enable'
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp',
    handler: 'TOTPController.disable'
  },

  {
    method: 'GET',
    path: '/api/v2/totp',
    handler: 'TOTPController.verifyTOTPToken'
  },

  {
    method: 'POST',
    path: '/api/v2/gsssync',
    handler: 'GSSSyncController.create'
  },

  {
    method: 'DELETE',
    path: '/api/v2/gsssync',
    handler: 'GSSSyncController.destroy'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/deleteExpiredUsers',
    handler: 'CronController.deleteExpiredUsers'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/deleteExpiredTokens',
    handler: 'CronController.deleteExpiredTokens'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/importLists',
    handler: 'CronController.importLists',
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderVerifyEmails',
    handler: 'CronController.sendReminderVerifyEmails'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderUpdateEmails',
    handler: 'CronController.sendReminderUpdateEmails'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderCheckoutEmails',
    handler: 'CronController.sendReminderCheckoutEmails'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderCheckinEmails',
    handler: 'CronController.sendReminderCheckinEmails'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/forcedResetPasswordAlert',
    handler: 'CronController.forcedResetPasswordAlert'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/forceResetPassword',
    handler: 'CronController.forceResetPassword'
  },

  {
    method: 'GET',
    path: '/api/v2/cron/doAutomatedCheckout',
    handler: 'CronController.doAutomatedCheckout'
  }
];
