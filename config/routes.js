/**
 * Routes optionsuration
 * (trails.options.routes)
 *
 * optionsure how routes map to views and controllers.
 *
 * @see http://trailsjs.io/doc/options/routes.js
 */
const Joi = require('@hapi/joi');

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

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
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
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/register',
    handler: ViewController.register,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/register',
    handler: ViewController.registerPost,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/verify',
    handler: ViewController.newPassword,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/verify2',
    handler: ViewController.verify,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/logout',
    handler: ViewController.logout,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/password',
    handler: ViewController.password,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/password',
    handler: ViewController.passwordPost,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/new_password',
    handler: ViewController.newPassword,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/new_password',
    handler: ViewController.newPasswordPost,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/user',
    handler: ViewController.user,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/profile',
    handler: ViewController.profile,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/profile/edit',
    handler: ViewController.profileEdit,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/profile/edit',
    handler: ViewController.profileEditSubmit,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/settings',
    handler: ViewController.settings,
    options: {
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
    options: {
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
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/oauth/jwks',
    handler: AuthController.jwks,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/login',
    handler: AuthController.login,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/oauth/authorize',
    handler: AuthController.authorizeDialogOauth2,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/oauth/authorize',
    handler: AuthController.authorizeOauth2,
    options: {
      auth: false,
    },
  },

  {
    method: ['GET', 'POST'],
    path: '/oauth/access_token',
    handler: AuthController.accessTokenOauth2,
    options: {
      auth: false,
    },
  },

  {
    method: ['GET', 'POST'],
    path: '/account.json',
    handler: UserController.showAccount,
  },

  {
    method: 'POST',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.authenticate,
  },
  {
    method: 'POST',
    path: '/api/v3/jsonwebtoken',
    handler: AuthController.authenticate,
  },

  {
    method: 'GET',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.jwtTokens,
  },
  {
    method: 'GET',
    path: '/api/v3/jsonwebtoken',
    handler: AuthController.jwtTokens,
  },

  {
    method: 'DELETE',
    path: '/api/v2/jsonwebtoken',
    handler: AuthController.blacklistJwt,
  },
  {
    method: 'DELETE',
    path: '/api/v3/jsonwebtoken',
    handler: AuthController.blacklistJwt,
  },

  {
    method: 'POST',
    path: '/api/v3/admintoken',
    handler: AuthController.authenticateAdmin,
  },

  {
    method: 'GET',
    path: '/api/v2/numbers',
    handler: NumbersController.numbers,
    options: {
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
    options: {
      pre: [
        UserPolicy.canCreate,
      ],
      handler: UserController.create,
    },
  },

  {
    method: 'POST',
    path: '/api/v3/user',
    options: {
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
      pre: [
        UserPolicy.canFind,
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v3/user/{id}',
    handler: UserController.find,
    options: {
      pre: [
        UserPolicy.canFind,
      ],
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
          extension: Joi.string().valid('csv', 'pdf', 'txt').required(),
        }),
      },
    },
  },

  {
    method: ['PUT', 'PATCH'],
    path: '/api/v2/user/{id}',
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.update,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'PUT', // No PATCH for v3 bc the function can't actually PATCH.
    path: '/api/v3/user/{id}',
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.update,
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
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.destroy,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'DELETE',
    path: '/api/v3/user/{id}',
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.destroy,
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
    options: {
      pre: [
        ListUserPolicy.canCheckin,
      ],
      handler: ListUserController.checkin,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          childAttribute: Joi.string().valid(...childAttributes).required(),
        }),
      },
    },
  },

  {
    method: ['PUT', 'PATCH'],
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    options: {
      pre: [
        ListUserPolicy.canUpdate,
      ],
      handler: ListUserController.update,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          childAttribute: Joi.string().valid(...childAttributes).required(),
        }),
      },
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/{childAttribute}/{checkInId}',
    options: {
      pre: [
        ListUserPolicy.canCheckout,
      ],
      handler: ListUserController.checkout,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          childAttribute: Joi.string().valid(...childAttributes).required(),
          checkInId: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/password',
    handler: UserController.resetPasswordEndpoint,
    options: {
      auth: false,
    },
  },
  {
    method: 'PUT',
    path: '/api/v3/user/password',
    handler: UserController.resetPasswordEndpoint,
    options: {
      auth: false,
    },
  },

  {
    method: 'PUT',
    path: '/api/v2/user/{id}/password',
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.updatePassword,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/v3/user/{id}/password',
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.updatePassword,
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
    options: {
      pre: [
        UserPolicy.canClaim,
      ],
      handler: UserController.claimEmail,
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
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.updatePicture,
      payload: {
        output: 'data',
        parse: true,
        allow: 'multipart/form-data',
      },
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
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.addEmail,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'POST',
    path: '/api/v3/user/{id}/emails',
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.addEmail,
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
    options: {
      pre: [
        UserPolicy.canUpdate,
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.setPrimaryEmail,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/v3/user/{id}/email',
    options: {
      pre: [
        UserPolicy.canUpdate,
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: UserController.setPrimaryEmail,
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
    options: {
      auth: false,
    },
  },
  {
    method: 'PUT',
    path: '/api/v3/user/emails/{email?}',
    handler: UserController.validateEmail,
    options: {
      auth: false,
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/user/{id}/emails/{email}',
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.dropEmail,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          email: Joi.string().email({ minDomainSegments: 2 }),
        }),
      },
    },
  },
  {
    method: 'DELETE',
    path: '/api/v3/user/{id}/emails/{email}',
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.dropEmail,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          email: Joi.string().email({ minDomainSegments: 2 }),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v2/user/{id}/phone_numbers',
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.addPhone,
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
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.dropPhone,
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
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.setPrimaryPhone,
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
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.setPrimaryOrganization,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/v3/user/{id}/organization',
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.setPrimaryOrganization,
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
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.updateConnection,
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
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.deleteConnection,
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
    options: {
      pre: [
        ServicePolicy.canSubscribe,
      ],
      handler: ServiceController.subscribe,
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
    options: {
      pre: [
        ServicePolicy.canUnsubscribe,
      ],
      handler: ServiceController.unsubscribe,
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
    options: {
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
    options: {
      pre: [
        ListPolicy.canUpdate,
      ],
      handler: ListController.update,
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
    options: {
      pre: [
        ListPolicy.canDestroy,
      ],
      handler: ListController.destroy,
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
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.create,
    },
  },
  {
    method: 'POST',
    path: '/api/v3/client',
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.create,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/client/{id?}',
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.find,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v3/client/{id?}',
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.find,
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
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.update,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/v3/client/{id}',
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.update,
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
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.destroy,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
  {
    method: 'DELETE',
    path: '/api/v3/client/{id}',
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: ClientController.destroy,
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
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: TrustedDomainController.create,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/trustedDomain/{id?}',
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: TrustedDomainController.find,
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
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      handler: TrustedDomainController.destroy,
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
    options: {
      pre: [
        ServicePolicy.canUpdate,
      ],
      handler: ServiceController.update,
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
    options: {
      pre: [
        ServicePolicy.canDestroy,
      ],
      handler: ServiceController.destroy,
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
    path: '/api/v3/totp/config',
    handler: TOTPController.generateConfig,
  },

  {
    method: 'POST',
    path: '/api/v2/totp/codes',
    handler: TOTPController.generateBackupCodes,
  },
  {
    method: 'POST',
    path: '/api/v3/totp/codes',
    handler: TOTPController.generateBackupCodes,
  },

  {
    method: 'POST',
    path: '/api/v2/totp/device',
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: TOTPController.saveDevice,
    },
  },
  {
    method: 'POST',
    path: '/api/v3/totp/device',
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
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
    method: 'DELETE',
    path: '/api/v3/totp/device/{id}',
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
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
      handler: TOTPController.enable,
    },
  },
  {
    method: 'POST',
    path: '/api/v3/totp',
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
      handler: TOTPController.enable,
    },
  },

  {
    method: 'DELETE',
    path: '/api/v2/totp',
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: TOTPController.disable,
    },
  },
  {
    method: 'DELETE',
    path: '/api/v3/totp',
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      handler: TOTPController.disable,
    },
  },

  {
    method: 'GET',
    path: '/api/v2/totp',
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
      handler: TOTPController.verifyTOTPToken,
    },
  },
  {
    method: 'GET',
    path: '/api/v3/totp',
    options: {
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
    options: {
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
    options: {
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
    options: {
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
    options: {
      pre: [
        OperationsPolicy.canUpdateOperation,
      ],
      handler: OperationController.update,
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
    options: {
      pre: [
        AuthPolicy.isAdminOrGlobalManager,
      ],
      handler: OperationController.destroy,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },
];
