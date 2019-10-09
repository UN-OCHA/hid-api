/**
 * Routes Configuration
 * (trails.config.routes)
 *
 * Configure how routes map to views and controllers.
 *
 * @see http://trailsjs.io/doc/config/routes.js
 */
const Joi = require('@hapi/joi');
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const ViewController = require('../api/controllers/ViewController');
const WebhooksController = require('../api/controllers/WebhooksController');
const WebhooksPolicy = require('../api/policies/WebhooksPolicy');
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

const childAttributes = [
  'operations',
  'bundles',
  'disasters',
  'lists',
  'organization',
  'organizations',
  'functional_roles',
  'offices',
];

module.exports = [

  /**
   * Render the login view
   */
  {
    method: 'GET',
    path: '/',
    handler: ViewController.login,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/register',
    handler: ViewController.register,
    config: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/register',
    handler: ViewController.registerPost,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/verify',
    handler: ViewController.newPassword,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/verify2',
    handler: ViewController.verify,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/logout',
    handler: ViewController.logout,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/password',
    handler: ViewController.password,
    config: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/password',
    handler: ViewController.passwordPost,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/new_password',
    handler: ViewController.newPassword,
    config: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/new_password',
    handler: ViewController.newPasswordPost,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/user',
    handler: ViewController.user,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/docs/{param*}',
    handler: {
      directory: {
        path: 'docs',
      },
    },
    config: {
      auth: false,
    },
  },

  /**
   * Default authentication path.
   */
  {
    method: 'GET',
    path: '/.well-known/openid-configuration',
    handler: AuthController.openIdConfiguration,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/oauth/jwks',
    handler: AuthController.jwks,
    config: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.authenticate,
  },

  {
    method: 'GET',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.jwtTokens,
  },

  {
    method: 'DELETE',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.blacklistJwt,
  },

  {
    method: 'POST',
    path: '/login',
    handler: AuthController.login,
    config: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/oauth/authorize',
    handler: AuthController.authorizeDialogOauth2,
    config: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/oauth/authorize',
    handler: AuthController.authorizeOauth2,
    config: {
      auth: false,
    },
  },

  {
    method: ['GET', 'POST'],
    path: '/oauth/access_token',
    handler: AuthController.accessTokenOauth2,
    config: {
      auth: false,
    },
  },

  {
    method: ['GET', 'POST'],
    path: '/account.json',
    handler: UserController.showAccount,
  },

  {
    method: 'GET',
    path: '/api/v2/numbers',
    handler: NumbersController.numbers,
    config: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/api/v2/signedRequest',
    handler: AuthController.signRequest,
  },

  {
    method: 'POST',
    path: '/api/v2/user',
    config: {
      pre: [
        UserPolicy.canCreate,
      ],
      handler: UserController.create,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/user/{id?}',
    handler: UserController.find,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'GET',
    path: '/api/v2/user.{extension}',
    handler: UserController.find,
    options: {
      validate: {
        params: Joi.object({
          extension: Joi.string().valid(['csv', 'pdf']).required(),
        }),
      },
    },
  },

  {
    method: ['PUT', 'PATCH'],
    path: '/api/v2/user/{id}',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.update,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}',
    config: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.destroy,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/notification',
    handler: UserController.notify,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/{childAttribute}',
    config: {
      pre: [
        ListUserPolicy.canCheckin,
      ],
      handler: ListUserController.checkin,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          childAttribute: Joi.string().valid(childAttributes).required(),
        }),
      },
    },
  },

  {
    method: ['PUT', 'PATCH'],
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    config: {
      pre: [
        ListUserPolicy.canUpdate,
      ],
      handler: ListUserController.update,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          childAttribute: Joi.string().valid(childAttributes).required(),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    config: {
      pre: [
        ListUserPolicy.canCheckout,
      ],
      handler: ListUserController.checkout,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          childAttribute: Joi.string().valid(childAttributes).required(),
          checkInId: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/password',
    handler: UserController.resetPasswordEndpoint,
    config: {
      auth: false,
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/password',
    config: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.updatePassword,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/orphan',
    config: {
      pre: [
        UserPolicy.canClaim,
      ],
      handler: UserController.claimEmail,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/picture',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.updatePicture,
      payload: {
        output: 'data',
        parse: true,
        allow: 'multipart/form-data',
      },
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/emails',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.addEmail,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/email',
    config: {
      pre: [
        UserPolicy.canUpdate,
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.setPrimaryEmail,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/emails/{email?}',
    handler: UserController.validateEmail,
    config: {
      auth: false,
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/emails/{email}',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.dropEmail,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/phone_numbers',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.addPhone,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/phone_numbers/{pid}',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.dropPhone,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          pid: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/phone_number',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.setPrimaryPhone,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/organization',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.setPrimaryOrganization,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/connections',
    handler: UserController.addConnection,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/connections/{cid}',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.updateConnection,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          cid: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/connections/{cid}',
    config: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.deleteConnection,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          cid: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/subscriptions',
    config: {
      pre: [
        ServicePolicy.canSubscribe,
      ],
      handler: ServiceController.subscribe,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/subscriptions/{serviceId}',
    config: {
      pre: [
        ServicePolicy.canUnsubscribe,
      ],
      handler: ServiceController.unsubscribe,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          serviceId: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/googlecredentials',
    handler: GSSSyncController.saveGoogleCredentials,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/outlookcredentials',
    handler: OutlookController.saveOutlookCredentials,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/list',
    config: {
      pre: [
        ListPolicy.canCreate,
      ],
      handler: ListController.create,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/list/{id?}',
    handler: ListController.find,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/list/{id}',
    config: {
      pre: [
        ListPolicy.canUpdate,
      ],
      handler: ListController.update,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/list/{id}',
    config: {
      pre: [
        ListPolicy.canDestroy,
      ],
      handler: ListController.destroy,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/client',
    config: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.create,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/client/{id?}',
    config: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.find,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/client/{id}',
    config: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.update,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/client/{id}',
    config: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.destroy,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/trustedDomain',
    config: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: TrustedDomainController.create,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/trustedDomain/{id?}',
    config: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: TrustedDomainController.find,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/trustedDomain/{id}',
    config: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: TrustedDomainController.destroy,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'GET',
    path: '/api/v2/notification/{id?}',
    handler: NotificationController.find,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/notification/{id?}',
    handler: NotificationController.update,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/service',
    handler: ServiceController.create,
  },

  {
    method: 'GET',
    path: '/api/v2/service/{id?}',
    handler: ServiceController.find,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'GET',
    path: '/api/v2/service/mailchimp/lists',
    handler: ServiceController.mailchimpLists,
  },

  {
    method: 'GET',
    path: '/api/v2/service/google/groups',
    handler: ServiceController.googleGroups,
  },

  {
    method: 'GET',
    path: '/api/v2/servicecredentials',
    handler: ServiceCredentialsController.find,
  },

  {
    method: ['PUT', 'PATCH'],
    path: '/api/v2/service/{id}',
    config: {
      pre: [
        ServicePolicy.canUpdate,
      ],
      handler: ServiceController.update,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/service/{id}',
    config: {
      pre: [
        ServicePolicy.canDestroy,
      ],
      handler: ServiceController.destroy,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/totp/qrcode',
    handler: TOTPController.generateQRCode,
  },

  {
    method: 'POST',
    path: '/api/v2/totp/codes',
    handler: TOTPController.generateBackupCodes,
  },

  {
    method: 'POST',
    path: '/api/v2/totp/device',
    config: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: TOTPController.saveDevice,
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp/device/{id}',
    handler: TOTPController.destroyDevice,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/totp',
    config: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
      handler: TOTPController.enable,
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp',
    config: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: TOTPController.disable,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/totp',
    config: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
      handler: TOTPController.verifyTOTPToken,
    },
  },

  {
    method: 'POST',
    path: '/api/v2/gsssync',
    handler: GSSSyncController.create,
  },

  {
    method: 'DELETE',
    path: '/api/v2/gsssync',
    config: {
      pre: [
        GSSSyncPolicy.canDestroy,
      ],
      handler: GSSSyncController.destroy,
    },
  },

  {
    method: 'POST',
    path: '/api/v2/outlookGroup',
    handler: OutlookController.create,
  },

  {
    method: 'POST',
    path: '/api/v2/webhooks/hrinfo',
    config: {
      auth: false,
      pre: [
        WebhooksPolicy.canRun,
      ],
      handler: WebhooksController.hrinfo,
    },
  },

  {
    method: 'POST',
    path: '/api/v2/operation',
    config: {
      pre: [
        AuthPolicy.isAdminOrGlobalManager,
      ],
      handler: OperationController.create,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/operation/{id?}',
    handler: OperationController.find,
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/operation/{id}',
    config: {
      pre: [
        OperationsPolicy.canUpdateOperation,
      ],
      handler: OperationController.update,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/operation/{id}',
    config: {
      pre: [
        AuthPolicy.isAdminOrGlobalManager,
      ],
      handler: OperationController.destroy,
    },
    options: {
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
];
