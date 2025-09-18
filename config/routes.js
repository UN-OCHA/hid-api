/**
 * Routes for HID Auth + API
 *
 * - Anything prefixed with "/api" is the API
 * - Everything else is HID Auth, which is a mix of OAuth/OpenID routes, plus
 *   user-facing things like login forms, password resets, profile, etc.
 *
 * @see https://hapi.dev/tutorials/routing/
 */
const Joi = require('joi');
const AdminController = require('../api/controllers/AdminController');
const AuthController = require('../api/controllers/AuthController');
const AuthPolicy = require('../api/policies/AuthPolicy');
const ClientController = require('../api/controllers/ClientController');
const NumbersController = require('../api/controllers/NumbersController');
const TOTPController = require('../api/controllers/TOTPController');
const UserController = require('../api/controllers/UserController');
const UserPolicy = require('../api/policies/UserPolicy');
const ViewController = require('../api/controllers/ViewController');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

module.exports = [

  /**
   * Public-facing pages
   *
   * None of these routes require a session. Account setup/recovery actions are
   * all included here: verify, password reset, API docs, etc.
   * Registration is disabled - https://humanitarian.atlassian.net/browse/HID-2438
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
    method: 'POST',
    path: '/login',
    handler: AuthController.login,
    options: {
      auth: false,
    },
  },

  /*
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
  */

  {
    method: 'GET',
    path: '/verify',
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
    path: '/new-password',
    handler: ViewController.newPassword,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/new-password',
    handler: ViewController.newPasswordPost,
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
   * Logged-in pages.
   *
   * You have to be logged in with a verified account to access these pages.
   */
  {
    method: 'GET',
    path: '/user',
    handler: ViewController.user,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'GET',
    path: '/profile',
    handler: ViewController.profile,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'GET',
    path: '/profile/edit',
    handler: ViewController.profileEdit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'POST',
    path: '/profile/edit',
    handler: ViewController.profileEditSubmit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'POST',
    path: '/profile/edit/emails',
    handler: ViewController.profileEmailsSubmit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'GET',
    path: '/settings',
    handler: ViewController.settings,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },
  {
    method: 'POST',
    path: '/settings/oauth-clients',
    handler: ViewController.settingsOauthSubmit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'GET',
    path: '/settings/password',
    handler: ViewController.settingsPassword,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },
  {
    method: 'POST',
    path: '/settings/password',
    handler: ViewController.settingsPasswordSubmit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'GET',
    path: '/settings/security',
    handler: ViewController.settingsSecurity,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },
  {
    method: 'POST',
    path: '/settings/security',
    handler: ViewController.settingsSecuritySubmit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'GET',
    path: '/settings/delete',
    handler: ViewController.settingsDelete,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },
  {
    method: 'POST',
    path: '/settings/delete',
    handler: ViewController.settingsDeleteSubmit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },

  {
    method: 'GET',
    path: '/admin',
    handler: AdminController.adminOauthClients,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },
  {
    method: 'GET',
    path: '/admin/client/{id}',
    handler: AdminController.adminOauthClientEdit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
    },
  },
  {
    method: 'POST',
    path: '/admin/client',
    handler: AdminController.adminOauthClientEditSubmit,
    options: {
      auth: {
        mode: 'required',
        strategy: 'session',
      },
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

  /**
   * OAuth
   */
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
    handler: AuthController.showAccount,
    options: {
      pre: [
        AuthPolicy.isUser,
      ],
    },
  },

  /**
   * API: JWT management
   */
  {
    method: 'POST',
    path: '/api/v3/jsonwebtoken',
    handler: AuthController.authenticate,
  },

  {
    method: 'GET',
    path: '/api/v3/jsonwebtoken',
    handler: AuthController.jwtTokens,
  },

  {
    method: 'DELETE',
    path: '/api/v3/jsonwebtoken',
    handler: AuthController.blacklistJwt,
  },

  /**
   * API: User management
   */
  {
    method: 'POST',
    path: '/api/v3/user',
    handler: UserController.create,
  },

  {
    method: 'GET',
    path: '/api/v3/user',
    handler: UserController.find,
    options: {
      pre: [
        UserPolicy.canFind,
      ],
    },
  },

  {
    method: 'GET',
    path: '/api/v3/user/{id}',
    handler: UserController.findOne,
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
    method: 'PUT',
    path: '/api/v3/user/{id}',
    handler: UserController.update,
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
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
    handler: UserController.destroy,
    options: {
      pre: [
        UserPolicy.canUpdate,
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v3/user/password-email',
    handler: UserController.resetPasswordEmail,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/api/v3/user/password',
    handler: UserController.resetPassword,
    options: {
      auth: false,
    },
  },

  {
    method: 'POST',
    path: '/api/v3/user/{id}/password',
    handler: UserController.updatePassword,
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v3/user/{id}/password-admin',
    handler: UserController.adminForceUpdatePassword,
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
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
    handler: UserController.addEmail,
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
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
    handler: UserController.setPrimaryEmail,
    options: {
      pre: [
        UserPolicy.canUpdate,
        AuthPolicy.isTOTPEnabledAndValid,
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  {
    method: 'POST',
    path: '/api/v3/user/emails/{email}',
    handler: UserController.sendValidationEmail,
    options: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/api/v3/user/emails/validate',
    handler: UserController.validateEmailAddress,
    options: {
      auth: false,
    },
  },

  {
    method: 'DELETE',
    path: '/api/v3/user/{id}/emails/{email}',
    handler: UserController.dropEmail,
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
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
    path: '/api/v3/user/{id}/clients/{client}',
    handler: UserController.revokeOauthClient,
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          client: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  /**
   * API: OAuth Client management
   */
  {
    method: 'POST',
    path: '/api/v3/client',
    handler: ClientController.create,
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
    },
  },

  {
    method: 'GET',
    path: '/api/v3/client/{id?}',
    handler: ClientController.find,
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
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
    handler: ClientController.update,
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
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
    handler: ClientController.destroy,
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
        }),
      },
    },
  },

  /**
   * API: 2FA management
   */
  {
    method: 'POST',
    path: '/api/v3/totp/config',
    handler: TOTPController.generateConfig,
  },

  {
    method: 'POST',
    path: '/api/v3/totp/codes',
    handler: TOTPController.generateBackupCodes,
  },

  {
    method: 'POST',
    path: '/api/v3/totp/device',
    handler: TOTPController.saveDevice,
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
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
    path: '/api/v3/totp',
    handler: TOTPController.enable,
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
    },
  },

  {
    method: 'DELETE',
    path: '/api/v3/totp',
    handler: TOTPController.disable,
    options: {
      pre: [
        AuthPolicy.isTOTPEnabledAndValid,
      ],
    },
  },

  {
    method: 'GET',
    path: '/api/v3/totp',
    handler: TOTPController.verifyTOTPToken,
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
    },
  },

  /**
   * API: Numbers
   */
  {
    method: 'GET',
    path: '/api/v3/numbers',
    handler: NumbersController.numbers,
    options: {
      pre: [
        AuthPolicy.isAdmin,
      ],
    },
  },

  /**
   * Branded 404
   */
  {
    method: ['GET', 'POST'],
    path: '/{any*}',
    handler: ViewController.http404Page,
    options: {
      auth: false,
    },
  },
];
