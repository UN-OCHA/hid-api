/**
 * Policies Configuration
 * (app.config.footprints)
 *
 * Define which prerequisites a request must pass before reaching the intended
 * controller action. By default, no policies are configured for controllers or
 * footprints, therefore the request always will directly reach the intended
 * handler.
 *
 * @see http://trailsjs.io/doc/config/policies
 */

'use strict';

module.exports = {

  AuthController: {
    jwtTokens: ['AuthPolicy.isAuthenticated'],
    blacklistJwt: ['AuthPolicy.isAuthenticated'],
    signRequest: ['AuthPolicy.isAuthenticated']
  },

  ClientController: {
    create: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdmin'],
    find: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdmin'],
    update: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdmin'],
    destroy: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdmin']
  },

  ServiceController: {
    create: ['AuthPolicy.isAuthenticated'],
    find: ['AuthPolicy.isAuthenticated'],
    update: ['AuthPolicy.isAuthenticated', 'ServicePolicy.canUpdate'],
    destroy: ['AuthPolicy.isAuthenticated', 'ServicePolicy.canDestroy'],
    mailchimpLists: ['AuthPolicy.isAuthenticated'],
    googleGroups: ['AuthPolicy.isAuthenticated'],
    subscribe: ['AuthPolicy.isAuthenticated', 'ServicePolicy.canSubscribe'],
    unsubscribe: ['AuthPolicy.isAuthenticated', 'ServicePolicy.canUnsubscribe']
  },

  ServiceCredentialsController: {
    find: ['AuthPolicy.isAuthenticated']
  },

  // Limit 2FA to admins for now
  TOTPController: {
    generateQRCode: ['AuthPolicy.isAuthenticated'],
    verifyTOTPToken: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isTOTPValidPolicy'],
    enable: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isTOTPValidPolicy'],
    disable: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isTOTPEnabledAndValid'],
    saveDevice: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isTOTPEnabledAndValid'],
    destroyDevice: ['AuthPolicy.isAuthenticated'],
    generateBackupCodes: ['AuthPolicy.isAuthenticated'],
  },

  UserController: {
    showAccount: [ 'AuthPolicy.isAuthenticated'],
    create: [ 'AuthPolicy.isAuthenticated', 'UserPolicy.canCreate' ],
    find: ['AuthPolicy.isAuthenticated'],
    update: ['AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate'],
    destroy: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isTOTPEnabledAndValid'],
    notify: ['AuthPolicy.isAuthenticated'],
    updatePassword: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isTOTPEnabledAndValid'],
    resetPasswordEndpoint: [],
    claimEmail: [ 'AuthPolicy.isAuthenticated', 'UserPolicy.canClaim'],
    updatePicture: [ 'AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate'],
    addEmail: [ 'AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate'],
    setPrimaryEmail: [ 'AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate', 'AuthPolicy.isTOTPEnabledAndValid'],
    validateEmail: [],
    dropEmail: [ 'AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate' ],
    addPhone: [ 'AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate' ],
    dropPhone: [ 'AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate'],
    setPrimaryPhone: ['AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate' ],
    setPrimaryOrganization: ['AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate'],
    addConnection: ['AuthPolicy.isAuthenticated'],
    updateConnection: ['AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate'],
    deleteConnection: ['AuthPolicy.isAuthenticated', 'UserPolicy.canUpdate']
  },

  ListUserController: {
    checkin: ['AuthPolicy.isAuthenticated', 'ListUserPolicy.canCheckin'],
    checkout: ['AuthPolicy.isAuthenticated', 'ListUserPolicy.canCheckout'],
    update: ['AuthPolicy.isAuthenticated', 'ListUserPolicy.canUpdate']
  },

  NotificationController: {
    find: ['AuthPolicy.isAuthenticated'],
    update: ['AuthPolicy.isAuthenticated']
  },

  ListController: {
    create: ['AuthPolicy.isAuthenticated', 'ListPolicy.canCreate'],
    find: ['AuthPolicy.isAuthenticated'],
    update: ['AuthPolicy.isAuthenticated', 'ListPolicy.canUpdate'],
    destroy: ['AuthPolicy.isAuthenticated', 'ListPolicy.canDestroy']
  },

  GSSSyncController: {
    create: ['AuthPolicy.isAuthenticated'],
    destroy: ['AuthPolicy.isAuthenticated', 'GSSSyncPolicy.canDestroy'],
    saveGoogleCredentials: ['AuthPolicy.isAuthenticated']
  },

  OutlookController: {
    saveOutlookCredentials: ['AuthPolicy.isAuthenticated'],
    create: ['AuthPolicy.isAuthenticated']
  },

  CronController: {
    synchronizeGoogleSpreadsheets: ['CronPolicy.canRun'],
    deleteExpiredUsers: ['CronPolicy.canRun'],
    deleteExpiredTokens: ['CronPolicy.canRun'],
    sendReminderVerifyEmails: ['CronPolicy.canRun'],
    sendReminderUpdateEmails: ['CronPolicy.canRun'],
    sendReminderCheckoutEmails: ['CronPolicy.canRun'],
    sendReminderCheckinEmails: ['CronPolicy.canRun'],
    forcedResetPasswordAlert: ['CronPolicy.canRun'],
    forcedResetPasswordAlert7: ['CronPolicy.canRun'],
    forceResetPassword: ['CronPolicy.canRun'],
    doAutomatedCheckout: ['CronPolicy.canRun'],
    sendSpecialPasswordResetEmail: ['CronPolicy.canRun'],
    verifyAutomatically: ['CronPolicy.canRun'],
    verificationExpiryEmail: ['CronPolicy.canRun'],
    unverifyAfterOneYear: ['CronPolicy.canRun'],
    setListCounts: ['CronPolicy.canRun'],
    verifyEmails: ['CronPolicy.canRun']
  },

  WebhooksController: {
    hrinfo: ['WebhooksPolicy.canRun']
  },

  OperationController: {
    create: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdminOrGlobalManager'],
    find: ['AuthPolicy.isAuthenticated'],
    update: ['AuthPolicy.isAuthenticated', 'OperationsPolicy.canUpdateOperation'],
    destroy: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdminOrGlobalManager']
  },

  TrustedDomainController: {
    create: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdmin'],
    find: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdmin'],
    destroy: ['AuthPolicy.isAuthenticated', 'AuthPolicy.isAdmin']
  }

};
