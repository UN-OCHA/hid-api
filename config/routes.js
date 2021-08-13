/**
 * Routes for HID Auth + API
 *
 * - Anything prefixed with "/api" is the API
 * - Everything else is HID Auth, which is a mix of OAuth/OpenID routes, plus
 *   user-facing things like login forms, password resets, profile, etc.
 *
 * @see https://hapi.dev/tutorials/routing/
 */
const Joi = require('@hapi/joi');

const AdminController = require('../api/controllers/AdminController');
const AuthController = require('../api/controllers/AuthController');
const AuthPolicy = require('../api/policies/AuthPolicy');
const ClientController = require('../api/controllers/ClientController');
const TOTPController = require('../api/controllers/TOTPController');
const UserController = require('../api/controllers/UserController');
const UserPolicy = require('../api/policies/UserPolicy');
const ViewController = require('../api/controllers/ViewController');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

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
    method: 'POST',
    path: '/profile/edit/emails',
    handler: ViewController.profileEmailsSubmit,
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
    method: 'POST',
    path: '/settings/oauth-clients',
    handler: ViewController.settingsOauthSubmit,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/settings/password',
    handler: ViewController.settingsPassword,
    options: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/settings/password',
    handler: ViewController.settingsPasswordSubmit,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/settings/security',
    handler: ViewController.settingsSecurity,
    options: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/settings/security',
    handler: ViewController.settingsSecuritySubmit,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/settings/delete',
    handler: ViewController.settingsDelete,
    options: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/settings/delete',
    handler: ViewController.settingsDeleteSubmit,
    options: {
      auth: false,
    },
  },

  {
    method: 'GET',
    path: '/admin',
    handler: AdminController.adminOauthClients,
    options: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/admin/client/{id}',
    handler: AdminController.adminOauthClientEdit,
    options: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/admin/client',
    handler: AdminController.adminOauthClientEditSubmit,
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
    options: {
      pre: [
        AuthPolicy.isUser,
      ],
      handler: AuthController.showAccount,
    },
  },

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
    path: '/api/v3/user/{id?}',
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
    method: 'PUT',
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
    path: '/api/v3/user/emails/{email?}',
    handler: UserController.validateEmail,
    options: {
      auth: false,
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
    method: 'DELETE',
    path: '/api/v3/user/{id}/clients/{client}',
    options: {
      pre: [
        UserPolicy.canUpdate,
      ],
      handler: UserController.revokeOauthClient,
      validate: {
        params: Joi.object({
          id: Joi.string().regex(objectIdRegex),
          client: Joi.string().regex(objectIdRegex),
        }),
      },
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
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
      handler: TOTPController.saveDevice,
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
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
      handler: TOTPController.enable,
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
    path: '/api/v3/totp',
    options: {
      pre: [
        AuthPolicy.isTOTPValidPolicy,
      ],
      handler: TOTPController.verifyTOTPToken,
    },
  },
];
