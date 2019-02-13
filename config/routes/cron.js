/**
 * Routes Configuration
 * (trails.config.routes)
 *
 * Configure how routes map to views and controllers.
 *
 * @see http://trailsjs.io/doc/config/routes.js
 */

'use strict';

const CronController = require('../api/controllers/CronController');
const CronPolicy = require('../api/policies/CronPolicy');

module.exports = [

  {
    method: 'GET',
    path: '/api/v2/cron/deleteExpiredUsers',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.deleteExpiredUsers
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/deleteExpiredTokens',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.deleteExpiredTokens
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderVerifyEmails',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.sendReminderVerifyEmails
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderUpdateEmails',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.sendReminderUpdateEmails
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderCheckoutEmails',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.sendReminderCheckoutEmails
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/sendReminderCheckinEmails',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.sendReminderCheckinEmails
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/forcedResetPasswordAlert',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.forcedResetPasswordAlert
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/forceResetPassword',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.forceResetPassword
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/forcedResetPasswordAlert7',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.forcedResetPasswordAlert7
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/doAutomatedCheckout',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.doAutomatedCheckout
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/specialPasswordReset',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.sendSpecialPasswordResetEmail
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/verifyAutomatically',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.verifyAutomatically
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/verificationExpiryEmail',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.verificationExpiryEmail
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/unverifyAfterOneYear',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.unverifyAfterOneYear
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/setListCounts',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.setListCounts
    }
  }

  /*{
    method: 'GET',
    path: '/api/v2/cron/verifyEmails',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.verifyEmails
    }
  },

  {
    method: 'GET',
    path: '/api/v2/cron/setAcronymsOrNames',
    config: {
      pre: [
        CronPolicy.canRun
      ],
      handler: CronController.setAcronymsOrNames
    }
  },*/
];
