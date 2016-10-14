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

'use strict'

module.exports = {

  FootprintController: ['AuthPolicy.isAuthenticated', 'ListOwner.set'],

  UserController: {
    create: ['AuthPolicy.isAuthenticated' ],
    find: ['AuthPolicy.isAuthenticated'],
    update: ['AuthPolicy.isAuthenticated'],
    destroy: ['AuthPolicy.isAuthenticated'],
    checkin: ['AuthPolicy.isAuthenticated'],
    checkout: ['AuthPolicy.isAuthenticated'],
    verifyEmail: [ ],
    resetPassword: [ ],
    claimEmail: [ 'AuthPolicy.isAuthenticated']
  },

  ListController: ['AuthPolicy.isAuthenticated'],

  DefaultController: {
    info: [ ]
  }

}
