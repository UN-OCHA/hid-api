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
const NotificationController = require('../api/controller/NotificationController');
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
    handler: ListUserController.updateListUsers
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
    handler: NumbersController.numbers
  },

  {
    method: 'POST',
    path: '/api/v2/signedRequest',
    handler: 'AuthController.signRequest'
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
    pre: [
      AuthPolicy.isAuthenticated,
      ListUserPolicy.canCheckin
    ],
    handler: ListUserController.checkin
  },

  {
    method: ['PUT', 'PATCH'],
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    pre: [
      AuthPolicy.isAuthenticated,
      ListUserPolicy.canUpdate
    ],
    handler: ListUserController.update
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    pre: [
      AuthPolicy.isAuthenticated,
      ListUserPolicy.canCheckout
    ],
    handler: ListUserController.checkout
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
    pre: [
      AuthPolicy.isAuthenticated,
      ServicePolicy.canSubscribe
    ],
    handler: ServiceController.subscribe
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/subscriptions/{serviceId}',
    pre: [
      AuthPolicy.isAuthenticated,
      ServicePolicy.canUnsubscribe
    ],
    handler: ServiceController.unsubscribe
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/googlecredentials',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: GSSSyncController.saveGoogleCredentials
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/outlookcredentials',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: OutlookController.saveOutlookCredentials
  },

  {
    method: 'POST',
    path: '/api/v2/list',
    pre: [
      AuthPolicy.isAuthenticated,
      ListPolicy.canCreate
    ],
    handler: ListController.create
  },

  {
    method: 'GET',
    path: '/api/v2/list/{id?}',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: ListController.find
  },

  {
    method: 'PUT',
    path: '/api/v2/list/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      ListPolicy.canUpdate
    ],
    handler: ListController.update
  },

  {
    method: 'DELETE',
    path: '/api/v2/list/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      ListPolicy.canDestroy
    ],
    handler: ListController.destroy
  },

  {
    method: 'POST',
    path: '/api/v2/client',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdmin
    ],
    handler: ClientController.create
  },

  {
    method: 'GET',
    path: '/api/v2/client/{id?}',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdmin
    ],
    handler: ClientController.find
  },

  {
    method: 'PUT',
    path: '/api/v2/client/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdmin
    ],
    handler: ClientController.update
  },

  {
    method: 'DELETE',
    path: '/api/v2/client/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdmin
    ],
    handler: ClientController.destroy
  },

  {
    method: 'POST',
    path: '/api/v2/trustedDomain',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdmin
    ],
    handler: TrustedDomainController.create
  },

  {
    method: 'GET',
    path: '/api/v2/trustedDomain/{id?}',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdmin
    ],
    handler: TrustedDomainController.find
  },

  {
    method: 'DELETE',
    path: '/api/v2/trustedDomain/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdmin
    ],
    handler: TrustedDomainController.destroy
  },

  {
    method: 'GET',
    path: '/api/v2/notification/{id?}',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: NotificationController.find
  },

  {
    method: 'PUT',
    path: '/api/v2/notification/{id?}',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: NotificationController.update
  },

  {
    method: 'POST',
    path: '/api/v2/service',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: ServiceController.create
  },

  {
    method: 'GET',
    path: '/api/v2/service/{id?}',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: ServiceController.find
  },

  {
    method: 'GET',
    path: '/api/v2/service/mailchimp/lists',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: ServiceController.mailchimpLists
  },

  {
    method: 'GET',
    path: '/api/v2/service/google/groups',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: ServiceController.googleGroups
  },

  {
    method: 'GET',
    path: '/api/v2/servicecredentials',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: ServiceCredentialsController.find
  },

  {
    method: [ 'PUT', 'PATCH' ],
    path: '/api/v2/service/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      ServicePolicy.canUpdate
    ],
    handler: ServiceController.update
  },

  {
    method: 'DELETE',
    path: '/api/v2/service/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      ServicePolicy.canDestroy
    ],
    handler: ServiceController.destroy
  },

  {
    method: 'POST',
    path: '/api/v2/totp/qrcode',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: TOTPController.generateQRCode
  },

  {
    method: 'POST',
    path: '/api/v2/totp/codes',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: TOTPController.generateBackupCodes
  },

  {
    method: 'POST',
    path: '/api/v2/totp/device',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isTOTPEnabledAndValid
    ],
    handler: TOTPController.saveDevice
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp/device/{id}',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: TOTPController.destroyDevice
  },

  {
    method: 'POST',
    path: '/api/v2/totp',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isTOTPValidPolicy
    ],
    handler: TOTPController.enable
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isTOTPEnabledAndValid
    ],
    handler: TOTPController.disable
  },

  {
    method: 'GET',
    path: '/api/v2/totp',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isTOTPValidPolicy
    ],
    handler: TOTPController.verifyTOTPToken
  },

  {
    method: 'POST',
    path: '/api/v2/gsssync',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: GSSSyncController.create
  },

  {
    method: 'DELETE',
    path: '/api/v2/gsssync',
    pre: [
      AuthPolicy.isAuthenticated,
      GSSSyncPolicy.canDestroy
    ],
    handler: GSSSyncController.destroy
  },

  {
    method: 'POST',
    path: '/api/v2/outlookGroup',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: OutlookController.create
  },

  {
    method: 'GET',
    path: '/api/v2/cron/deleteExpiredUsers',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.deleteExpiredUsers
  },

  {
    method: 'GET',
    path: '/api/v2/cron/deleteExpiredTokens',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.deleteExpiredTokens
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderVerifyEmails',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.sendReminderVerifyEmails
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderUpdateEmails',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.sendReminderUpdateEmails
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderCheckoutEmails',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.sendReminderCheckoutEmails
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderCheckinEmails',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.sendReminderCheckinEmails
  },

  {
    method: 'GET',
    path: '/api/v2/cron/forcedResetPasswordAlert',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.forcedResetPasswordAlert
  },

  {
    method: 'GET',
    path: '/api/v2/cron/forceResetPassword',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.forceResetPassword
  },

  {
    method: 'GET',
    path: '/api/v2/cron/forcedResetPasswordAlert7',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.forcedResetPasswordAlert7
  },

  {
    method: 'GET',
    path: '/api/v2/cron/doAutomatedCheckout',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.doAutomatedCheckout
  },

  {
    method: 'GET',
    path: '/api/v2/cron/specialPasswordReset',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.sendSpecialPasswordResetEmail
  },

  {
    method: 'GET',
    path: '/api/v2/cron/verifyAutomatically',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.verifyAutomatically
  },

  {
    method: 'GET',
    path: '/api/v2/cron/verificationExpiryEmail',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.verificationExpiryEmail
  },

  {
    method: 'GET',
    path: '/api/v2/cron/unverifyAfterOneYear',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.unverifyAfterOneYear
  },

  {
    method: 'GET',
    path: '/api/v2/cron/setListCounts',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.setListCounts
  },

  {
    method: 'GET',
    path: '/api/v2/cron/verifyEmails',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.verifyEmails
  },

  {
    method: 'GET',
    path: '/api/v2/cron/setAcronymsOrNames',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.setAcronymsOrNames
  },

  {
    method: 'GET',
    path: '/api/v2/cron/deleteCustomLists',
    pre: [
      CronPolicy.canRun
    ],
    handler: CronController.deleteCustomLists
  },

  {
    method: 'POST',
    path: '/api/v2/webhooks/hrinfo',
    pre: [
      WebhooksPolicy.canRun
    ],
    handler: WebhooksController.hrinfo
  },

  {
    method: 'POST',
    path: '/api/v2/operation',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdminOrGlobalManager
    ],
    handler: OperationController.create
  },

  {
    method: 'GET',
    path: '/api/v2/operation/{id?}',
    pre: [
      AuthPolicy.isAuthenticated
    ],
    handler: OperationController.find
  },

  {
    method: 'PUT',
    path: '/api/v2/operation/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      OperationsPolicy.canUpdateOperation
    ],
    handler: OperationController.update
  },

  {
    method: 'DELETE',
    path: '/api/v2/operation/{id}',
    pre: [
      AuthPolicy.isAuthenticated,
      AuthPolicy.isAdminOrGlobalManager
    ],
    handler: OperationController.destroy
  },
];
