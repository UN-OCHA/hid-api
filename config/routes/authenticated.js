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

  {
    method: 'GET',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.jwtTokens
  },

  {
    method: 'DELETE',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.blacklistJwt
  },

  {
    method: ['GET', 'POST'],
    path: '/account.json',
    handler: UserController.showAccount
  },

  {
    method: 'POST',
    path: '/api/v2/signedRequest',
    handler: AuthController.signRequest
  },

  {
    method: 'POST',
    path: '/api/v2/user',
    config: {
      pre: [
        UserPolicy.canCreate
      ],
      handler: UserController.create
    }
  },

  {
    method: 'GET',
    path: '/api/v2/user/{id?}',
    handler: UserController.find
  },

  {
    method: 'GET',
    path: '/api/v2/user.{extension}',
    handler: UserController.find
  },

  {
    method: [ 'PUT', 'PATCH' ],
    path: '/api/v2/user/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.update
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isTOTPEnabledAndValid
      ],
      handler: UserController.destroy
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/notification',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: UserController.notify
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/{childAttribute}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ListUserPolicy.canCheckin
      ],
      handler: ListUserController.checkin
    }
  },

  {
    method: ['PUT', 'PATCH'],
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ListUserPolicy.canUpdate
      ],
      handler: ListUserController.update
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ListUserPolicy.canCheckout
      ],
      handler: ListUserController.checkout
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/password',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isTOTPEnabledAndValid
      ],
      handler: UserController.updatePassword
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/orphan',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canClaim
      ],
      handler: UserController.claimEmail
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/picture',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.updatePicture,
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
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.addEmail
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/email',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate,
        AuthPolicy.isTOTPEnabledAndValid
      ],
      handler: UserController.setPrimaryEmail
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/emails/{email}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.dropEmail
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/phone_numbers',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.addPhone
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/phone_numbers/{pid}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.dropPhone
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/phone_number',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.setPrimaryPhone
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/organization',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.setPrimaryOrganization
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/connections',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: UserController.addConnection
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/connections/{cid}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.updateConnection
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/connections/{cid}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        UserPolicy.canUpdate
      ],
      handler: UserController.deleteConnection
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/subscriptions',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ServicePolicy.canSubscribe
      ],
      handler: ServiceController.subscribe
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/subscriptions/{serviceId}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ServicePolicy.canUnsubscribe
      ],
      handler: ServiceController.unsubscribe
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/googlecredentials',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: GSSSyncController.saveGoogleCredentials
    }
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/outlookcredentials',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: OutlookController.saveOutlookCredentials
    }
  },

  {
    method: 'POST',
    path: '/api/v2/list',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ListPolicy.canCreate
      ],
      handler: ListController.create
    }
  },

  {
    method: 'GET',
    path: '/api/v2/list/{id?}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: ListController.find
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/list/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ListPolicy.canUpdate
      ],
      handler: ListController.update
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/list/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ListPolicy.canDestroy
      ],
      handler: ListController.destroy
    }
  },

  {
    method: 'POST',
    path: '/api/v2/client',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdmin
      ],
      handler: ClientController.create
    }
  },

  {
    method: 'GET',
    path: '/api/v2/client/{id?}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdmin
      ],
      handler: ClientController.find
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/client/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdmin
      ],
      handler: ClientController.update
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/client/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdmin
      ],
      handler: ClientController.destroy
    }
  },

  {
    method: 'POST',
    path: '/api/v2/trustedDomain',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdmin
      ],
      handler: TrustedDomainController.create
    }
  },

  {
    method: 'GET',
    path: '/api/v2/trustedDomain/{id?}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdmin
      ],
      handler: TrustedDomainController.find
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/trustedDomain/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdmin
      ],
      handler: TrustedDomainController.destroy
    }
  },

  {
    method: 'GET',
    path: '/api/v2/notification/{id?}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: NotificationController.find
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/notification/{id?}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: NotificationController.update
    }
  },

  {
    method: 'POST',
    path: '/api/v2/service',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: ServiceController.create
    }
  },

  {
    method: 'GET',
    path: '/api/v2/service/{id?}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: ServiceController.find
    }
  },

  {
    method: 'GET',
    path: '/api/v2/service/mailchimp/lists',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: ServiceController.mailchimpLists
    }
  },

  {
    method: 'GET',
    path: '/api/v2/service/google/groups',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: ServiceController.googleGroups
    }
  },

  {
    method: 'GET',
    path: '/api/v2/servicecredentials',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: ServiceCredentialsController.find
    }
  },

  {
    method: [ 'PUT', 'PATCH' ],
    path: '/api/v2/service/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ServicePolicy.canUpdate
      ],
      handler: ServiceController.update
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/service/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        ServicePolicy.canDestroy
      ],
      handler: ServiceController.destroy
    }
  },

  {
    method: 'POST',
    path: '/api/v2/totp/qrcode',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: TOTPController.generateQRCode
    }
  },

  {
    method: 'POST',
    path: '/api/v2/totp/codes',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: TOTPController.generateBackupCodes
    }
  },

  {
    method: 'POST',
    path: '/api/v2/totp/device',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isTOTPEnabledAndValid
      ],
      handler: TOTPController.saveDevice
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp/device/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: TOTPController.destroyDevice
    }
  },

  {
    method: 'POST',
    path: '/api/v2/totp',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isTOTPValidPolicy
      ],
      handler: TOTPController.enable
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isTOTPEnabledAndValid
      ],
      handler: TOTPController.disable
    }
  },

  {
    method: 'GET',
    path: '/api/v2/totp',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isTOTPValidPolicy
      ],
      handler: TOTPController.verifyTOTPToken
    }
  },

  {
    method: 'POST',
    path: '/api/v2/gsssync',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: GSSSyncController.create
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/gsssync',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        GSSSyncPolicy.canDestroy
      ],
      handler: GSSSyncController.destroy
    }
  },

  {
    method: 'POST',
    path: '/api/v2/outlookGroup',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: OutlookController.create
    }
  },

  {
    method: 'POST',
    path: '/api/v2/operation',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdminOrGlobalManager
      ],
      handler: OperationController.create
    }
  },

  {
    method: 'GET',
    path: '/api/v2/operation/{id?}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated
      ],
      handler: OperationController.find
    }
  },

  {
    method: 'PUT',
    path: '/api/v2/operation/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        OperationsPolicy.canUpdateOperation
      ],
      handler: OperationController.update
    }
  },

  {
    method: 'DELETE',
    path: '/api/v2/operation/{id}',
    config: {
      pre: [
        AuthPolicy.isAuthenticated,
        AuthPolicy.isAdminOrGlobalManager
      ],
      handler: OperationController.destroy
    }
  },
];
