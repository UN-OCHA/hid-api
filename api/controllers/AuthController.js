'use strict'

const Controller = require('trails-controller')
const Boom = require('boom')

/**
 * @module AuthController
 * @description Generated Trails.js Controller.
 */
module.exports = class AuthController extends Controller{

  _loginHelper (request, reply, next) {
    var email = request.payload.email
    var password = request.payload.password

    if (!email || !password) {
      reply(Boom.unauthorized('email and password required'));
    }
    else {
      var that = this;
      var app = this.app;
      var query = this.app.orm.User.where({ email: email });
      query
        .populate("favoriteLists operations.list organizations.list organization.list bundles.list lists.list")
        .findOne(function (err, user) {
          if (!user) {
            that.log.info('Could not find user');
            return reply(Boom.unauthorized('invalid email or password'));
          }

          if (!user.email_verified) {
            that.log.info('User has not verified his email');
            return reply(Boom.unauthorized('Please verify your email address'));
          }

          if (!user.validPassword(password)) {
            that.log.info("Wrong password");
            return reply(Boom.unauthorized('invalid email or password'));
          }
          else {
            return next(user);
          }
        })
    }
  }
  /**
   * Authenticate user through JWT
   */
  authenticate (request, reply) {
    var that = this
    this._loginHelper(request, reply, function (user) {
      return reply({
        user: user,
        token: that.app.services.JwtService.issue({id: user._id })
      });
    });
  }

  /**
   * Create a session and redirect to /oauth/authorize
   */
  login (request, reply) {
    var that = this
    this._loginHelper(request, reply, function (user) {
      // Redirect to /oauth/authorize
      request.yar.set('session', { userId: user._id })
      var redirect = request.payload.redirect || '/oauth/authorize';
      redirect += "?client_id=" + request.payload.client_id;
      redirect += "&redirect_uri=" + request.payload.redirect_uri;
      redirect += "&response_type=" + request.payload.response_type;
      redirect += "&state=" + request.payload.state;
      redirect += "&scope=" + request.payload.scope;

      if (typeof request.payload.response_type == 'undefined' || typeof request.payload.scope == 'undefined') {
        //that.log.warn({type: 'authenticate:error', body: req.body, cookies: req.cookies, header: req.headers, query: req.query},
        //  'Undefined response_type or scope');
      }

      // Record the successful authentication date.
      // This facilitates troubleshooting, e.g., 10 account floods, no successes since last year.
      /*currentUser.login_last = Date.now();
      currentUser.save(function(err, item) {
        if (err || !item) {
          log.warn({ type: 'account:error', data: item, err: err },
            'Error occurred trying to update user account ' + item.user_id + ' with login success timestamp.'
          );
        }
        else {
          log.info({ type: 'account:success', data: item },
            'User account updated with login access timestamp for ID ' + item.user_id + '.'
          );
        }
      });*/

      reply.redirect(redirect);
      that.log.info('Authentication successful for ' + request.payload.email + '. Redirecting to ' + redirect)

    });
  }

  authorizeDialogOauth2 (request, reply) {
    const User = this.app.orm.User
    const Client = this.app.orm.Client
    const oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize'];

    // If the user is not authenticated, redirect to the login page and preserve
    // all relevant query parameters.
    const cookie = request.yar.get('session')
    if (!cookie.userId) {
      this.log.info('Get request to /oauth/authorize without session. Redirecting to the login page.');
      return reply.redirect('/?redirect=/oauth/authorize&client_id=' + request.query.client_id + '&redirect_uri=' + request.query.redirect_uri + '&response_type=' + request.query.response_type + '&state=' + request.query.state + '&scope=' + request.query.scope + '#login');
    }

    // If the user is authenticated, then check whether the user has confirmed
    // authorization for this client/scope combination.
    var that = this
    User
      .findOne({_id: cookie.userId})
      .populate('authorizedClients')
      .exec(function (err, user) {
      var clientId = request.query.client_id,
        scope = request.query.scope;

      if (err) {
        that.log.warn('An error occurred in /oauth/authorize while trying to fetch the user record for ' + cookie.userId + ' who is an active session.');
        return reply(Boom.badImplementation('An error occurred while processing request. Please try logging in again.'))
      }
      else {
        request.auth.credentials = user
        oauth.authorize(request, reply, function (req, res) {
          if (!request.response || (request.response && !request.response.isBoom)) {
            if (user.authorizedClients && user.hasAuthorizedClient(clientId)) {
              request.payload = {transaction_id: req.oauth2.transactionID }
              oauth.decision(request, reply)
            }
            else {
              // The user has not confirmed authorization, so present the
              // authorization page.
              return reply.view('authorize', {
                user: user,
                client: req.oauth2.client,
                transactionID: req.oauth2.transactionID
                //csrf: req.csrfToken()
              });
            }
          }
        }, {}, function (clientID, redirect, done) {
          Client.findOne({id: clientID}, function (err, client) {
            if (err || !client || !client.id) {
              return done('An error occurred while processing the request. Please try logging in again.')
            }
            // Verify redirect uri
            if (client.redirectUri != redirect) {
              return done('Wrong redirect URI')
            }
            return done(null, client, client.redirectUri)
          });
        });
      }
    });
  }

  authorizeOauth2 (request, reply) {
    const User = this.app.orm.User
    const Client = this.app.orm.Client
    const oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize']
    const cookie = request.yar.get('session')
    if (!cookie.userId) {
      this.log.info('Got request to /oauth/authorize without session. Redirecting to the login page.');
      return reply.redirect('/?redirect=/oauth/authorize&client_id=' + request.query.client_id + '&redirect_uri=' + request.query.redirect_uri + '&response_type=' + request.query.response_type + '&state=' + request.query.state + '&scope=' + request.query.scope + '#login');
    }
    
    var that = this
    User.findOne({_id: cookie.userId}, function (err, user) {
      if (err) {
        that.log.warn('An error occurred in /oauth/authorize while trying to fetch the user record for ' + cookie.userId + ' who is an active session.')
        return reply(Boom.badImplementation('An error occurred while processing request. Please try logging in again.'))
      }
      if (!user) {
        that.log.warn('Could not find user with ID ' + cookie.userId)
        return reply(Boom.badRequest('Could not find user'))
      }
      request.auth.credentials = user
      // Save authorized client if user allowed
      const clientId = request.yar.authorize[request.payload.transaction_id].client
      if (!request.payload.cancel && !user.hasAuthorizedClient(clientId)) {
        user.authorizedClients.push(request.yar.authorize[request.payload.transaction_id].client)
        user.markModified('authorizedClients')
        user.save(function (err) {
          oauth.decision(request, reply)
        })
      }
      else {
        oauth.decision(request, reply)
      }
    })
  }

  accessTokenOauth2 (request, reply) {
    const oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize']
    const OauthToken = this.app.orm.OauthToken
    const code = request.payload.code
    if (!code) return reply(Boom.badRequest('Missing authorization code'))
    OauthToken
      .findOne({token: code, type: 'code'})
      .populate('client user')
      .exec(function (err, ocode) {
        if (err) return reply(Boom.badRequest('Wrong authorization code'))
        request.auth.credentials = ocode.client
        oauth.token(request, reply)
      })
  }


}

