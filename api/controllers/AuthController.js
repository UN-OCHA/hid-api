'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');

/**
 * @module AuthController
 * @description Generated Trails.js Controller.
 */
module.exports = class AuthController extends Controller{

  _loginHelper (request, reply) {
    const User = this.app.orm.User;
    const email = request.payload ? request.payload.email : false;
    const password = request.payload ? request.payload.password : false;
    const authPolicy = this.app.policies.AuthPolicy;

    if (!email || !password) {
      authPolicy.isAuthenticated(request, function (err) {
        if (err && err.isBoom) {
          return reply(err);
        }
        else {
          const cuser = request.params.currentUser;
          cuser.sanitize(cuser);
          return reply(cuser);
        }
      });
    }
    else {
      const that = this;
      User
        .findOne({email: email})
        .then((user) => {
          if (!user) {
            that.log.info('Could not find user');
            return reply(Boom.unauthorized('Email address could not be found'));
          }

          if (!user.email_verified) {
            that.log.info('User has not verified his email');
            return reply(Boom.unauthorized('Please verify your email address'));
          }

          if (user.deleted) {
            that.log.info('Attempt to login from a deleted user');
            return reply(Boom.unauthorized('invalid email or password'));
          }

          if (!user.validPassword(password)) {
            that.log.info('Wrong password');
            return reply(Boom.unauthorized('invalid email or password'));
          }
          else {
            user.sanitize(user);
            return reply(user);
          }
        })
        .catch((err) => {
          that.app.services.ErrorService.handle(err, reply);
        });
    }
  }
  /**
   * Authenticate user through JWT
   */
  authenticate (request, reply) {
    const that = this;
    const JwtToken = this.app.orm.JwtToken;
    this._loginHelper(request, function (result) {
      if (!result.isBoom) {
        const payload = {id: result._id};
        if (request.payload && request.payload.exp) {
          payload.exp = request.payload.exp;
        }
        const token = that.app.services.JwtService.issue(payload);
        if (!payload.exp) {
          // Creating an API key, store the token in the database
          JwtToken
            .create({
              token: token,
              user: result._id,
              blacklist: false
              // TODO: add expires
            })
            .then(() => {
              reply({
                user: result,
                token: token
              });
            })
            .catch((err) => {
              that.app.services.ErrorService.handle(err, reply);
            });
          }
          else {
            return reply({ user: result, token: token});
          }
      }
      else {
        return reply(result);
      }
    });
  }

  /**
   * Create a session and redirect to /oauth/authorize
   */
  login (request, reply) {
    const that = this;
    this._loginHelper(request, function (result) {
      if (!result.isBoom) {
        // Redirect to /oauth/authorize
        request.yar.set('session', { userId: result._id });
        let redirect = '';
        if (request.payload.response_type) {
          redirect = request.payload.redirect || '/oauth/authorize';
          redirect += '?client_id=' + request.payload.client_id;
          redirect += '&redirect_uri=' + request.payload.redirect_uri;
          redirect += '&response_type=' + request.payload.response_type;
          redirect += '&scope=' + request.payload.scope;
          if (request.payload.state) {
            redirect += '&state=' + request.payload.state;
          }
          if (request.payload.nonce) {
            redirect += '&nonce=' + request.payload.nonce;
          }
        }
        else {
          redirect = '/user';
        }

        /*if (typeof request.payload.response_type === 'undefined' || typeof request.payload.scope === 'undefined') {
          //that.log.warn({type: 'authenticate:error', body: req.body, cookies: req.cookies, header: req.headers, query: req.query},
          //  'Undefined response_type or scope');
        }

        // Record the successful authentication date.
        // This facilitates troubleshooting, e.g., 10 account floods, no successes since last year.
        currentUser.login_last = Date.now();
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
        that.log.info(
          'Authentication successful for ' +
          request.payload.email +
          '. Redirecting to ' +
          redirect
        );
      }
      else {
        let params = that.app.services.HelperService.getOauthParams(request.payload);

        let registerLink = '/register';
        if (params) {
          registerLink += '?' + params;
        }

        let passwordLink = '/password';
        if (params) {
          passwordLink += '?' + params;
        }

        return reply.view('login', {
          title: 'Log into Humanitarian ID',
          query: request.payload,
          registerLink: registerLink,
          passwordLink: passwordLink,
          alert: {
            type: 'danger',
            message: 'We could not log you in. Please check your email/password'
          }
        });
      }
    });
  }

  authorizeDialogOauth2 (request, reply) {
    const User = this.app.orm.User;
    const Client = this.app.orm.Client;
    const oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize'];

    // Check response_type
    if (!request.query.response_type) {
      return reply(Boom.badRequest('Missing response_type'));
    }

    // If the user is not authenticated, redirect to the login page and preserve
    // all relevant query parameters.
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId)) {
      this.log.info(
        'Get request to /oauth/authorize without session. Redirecting to the login page.'
      );
      return reply.redirect(
        '/?redirect=/oauth/authorize&client_id=' + request.query.client_id +
        '&redirect_uri=' + request.query.redirect_uri +
        '&response_type=' + request.query.response_type +
        '&state=' + request.query.state +
        '&scope=' + request.query.scope +
        '&nonce=' + request.query.nonce + '#login'
      );
    }

    // If the user is authenticated, then check whether the user has confirmed
    // authorization for this client/scope combination.
    const that = this;
    User
      .findOne({_id: cookie.userId})
      .populate({path: 'authorizedClients', select: 'id name'})
      .exec(function (err, user) {
        const clientId = request.query.client_id;

        if (err) {
          that.log.warn(
            'An error occurred in /oauth/authorize while trying to fetch the user record for ' +
            cookie.userId +
            ' who is an active session.'
          );
          return reply(
            Boom.badImplementation('An error occurred while processing request. Please try logging in again.')
          );
        }
        else {
          user.sanitize(user);
          request.auth.credentials = user;
          oauth.authorize(request, reply, function (req, res) {
            if (!request.response || (request.response && !request.response.isBoom)) {
              if (user.authorizedClients && user.hasAuthorizedClient(clientId)) {
                request.payload = {transaction_id: req.oauth2.transactionID };
                oauth.decision(request, reply);
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
                return done(
                  'An error occurred while processing the request. Please try logging in again.'
                );
              }
              // Verify redirect uri
              if (client.redirectUri !== redirect) {
                that.log.debug('Wrong redirect URI');
                return done('Wrong redirect URI');
              }
              return done(null, client, client.redirectUri);
            });
          });
        }
      }
    );
  }

  authorizeOauth2 (request, reply) {
    const User = this.app.orm.User;
    const oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize'];
    const cookie = request.yar.get('session');

    if (!cookie || (cookie && !cookie.userId)) {
      this.log.info('Got request to /oauth/authorize without session. Redirecting to the login page.');
      return reply.redirect('/?redirect=/oauth/authorize&client_id=' + request.query.client_id +
        '&redirect_uri=' + request.query.redirect_uri +
        '&response_type=' + request.query.response_type +
        '&state=' + request.query.state +
        '&scope=' + request.query.scope +
        '&nonce=' + request.query.nonce + '#login'
      );
    }

    const that = this;
    User.findOne({_id: cookie.userId}, function (err, user) {
      if (err) {
        that.log.warn('An error occurred in /oauth/authorize while trying to fetch the user record for ' + cookie.userId +
          ' who is an active session.');
        return reply(Boom.badImplementation('An error occurred while processing request. Please try logging in again.'));
      }
      if (!user) {
        that.log.warn('Could not find user with ID ' + cookie.userId);
        return reply(Boom.badRequest('Could not find user'));
      }
      user.sanitize(user);
      request.auth.credentials = user;
      // Save authorized client if user allowed
      const clientId = request.yar.authorize[request.payload.transaction_id].client;
      if (!request.payload.cancel && !user.hasAuthorizedClient(clientId)) {
        user.authorizedClients.push(request.yar.authorize[request.payload.transaction_id].client);
        user.markModified('authorizedClients');
        user.save(function (err) {
          oauth.decision(request, reply);
        });
      }
      else {
        oauth.decision(request, reply);
      }
    });
  }

  accessTokenOauth2 (request, reply) {
    this.log.info('Requesting access token');
    const oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize'];
    const OauthToken = this.app.orm.OauthToken;
    const code = request.payload.code;
    if (!code) {
      return reply(Boom.badRequest('Missing authorization code'));
    }
    const that = this;
    OauthToken
      .findOne({token: code, type: 'code'})
      .populate('client user')
      .exec(function (err, ocode) {
        if (err) {
          return reply(Boom.badRequest('Wrong authorization code'));
        }
        that.log.info('Found access token for client ');
        request.auth.credentials = ocode.client;
        oauth.token(request, reply);
      });
  }

  openIdConfiguration (request, reply) {
    const root = process.env.ROOT_URL;
    const out = {
      issuer: root,
      authorization_endpoint: root + '/oauth/authorize',
      token_endpoint: root + '/oauth/access_token',
      userinfo_endpoint: root + '/account.json',
      jwks_uri: root + '/oauth/jwks',
      response_types_supported: ['code', 'token', 'id_token', 'id_token token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'email', 'profile', 'phone'],
      claims_supported: [
        'iss',
        'sub',
        'aud',
        'exp',
        'iat',
        'name',
        'given_name',
        'family_name',
        'middle_name',
        'picture',
        'email',
        'email_verified',
        'zoneinfo',
        'locale',
        'phone_number',
        'phone_number_verified',
        'updated_at'
      ]
    };
    reply(out);
  }

  jwks (request, reply) {
    const key = this.app.services.JwtService.public2jwk();
    key.alg = 'RS256';
    const out = {
      keys: [
        key
      ]
    };
    reply (out);
  }

  // Provides a list of the json web tokens with no expiration date created by the current user
  jwtTokens (request, reply) {
    const JwtToken = this.app.orm.JwtToken;
    const that = this;
    JwtToken
      .find({user: request.params.currentUser._id})
      .then((tokens) => {
        return reply(tokens);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, reply);
      });
  }

  // Blacklist a JSON Web Token
  blacklistJwt (request, reply) {
    const JwtToken = this.app.orm.JwtToken;
    const that = this;
    const token = request.payload ? request.payload.token : null;
    if (!token) {
      return reply(Boom.badRequest('Missing token'));
    }
    // Check that blacklisted token belongs to current user
    this.app.services.JwtService.verify(token, function (err, jtoken) {
      if (err) {
        return that.app.services.ErrorService.handle(err, reply);
      }
      if (jtoken.id === request.params.currentUser.id) {
        // Blacklist token
        JwtToken
          .findOneAndUpdate({token: token}, {
            token: token,
            user: request.params.currentUser._id,
            blacklist: true
          }, {upsert: true, new: true})
          .then(doc => {
            return reply(doc);
          })
          .catch(err => {
            that.app.services.ErrorService.handle(err, reply);
          });
      }
      else {
        return reply(Boom.badRequest('Could not blacklist this token because you did not generate it'));
      }
    });
  }


};
