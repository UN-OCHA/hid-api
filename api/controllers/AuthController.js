'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');

/**
 * @module AuthController
 * @description Controller for Auth.
 */
module.exports = class AuthController extends Controller{

  // Main helper function used for login. All logins go through this.
  _loginHelper (request, reply) {
    const User = this.app.orm.User;
    const Flood = this.app.orm.Flood;
    const email = request.payload ? request.payload.email.toLowerCase() : false;
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
      // If there has been 5 failed login attempts in the last 5 minutes, return
      // unauthorized.
      const now = Date.now();
      const offset = 5 * 60 * 1000;
      const d5minutes = new Date(now - offset);

      Flood
        .count({email: email, createdAt: {$gte: d5minutes.toISOString()}})
        .then((number) => {
          if (number >= 5) {
            that.log.warn('Account locked for 5 minutes', {email: email, security: true, fail: true, request: request});
            throw Boom.tooManyRequests('Your account has been locked for 5 minutes because of too many requests.');
          }
          else {
            return User.findOne({email: email});
          }
        })
        .then((user) => {
          if (!user) {
            that.log.warn('Unsuccessful login attempt due to invalid email address', {email: email, security: true, fail: true, request: request});
            return reply(Boom.unauthorized('invalid email or password'));
          }

          if (!user.email_verified) {
            that.log.warn('Unsuccessful login attempt due to unverified email', {email: email, security: true, fail: true, request: request});
            return reply(Boom.unauthorized('Please verify your email address'));
          }

          if (user.deleted) {
            that.log.warn('Unsuccessful login attempt due to deactivated user', {email: email, security: true, fail: true, request: request});
            return reply(Boom.unauthorized('invalid email or password'));
          }

          if (!user.validPassword(password)) {
            that.log.warn('Unsuccessful login attempt due to invalid password', {email: email, security: true, fail: true, request: request});
            // Create a flood entry
            Flood
              .create({type: 'login', email: email, user: user})
              .then(() => {
                return reply(Boom.unauthorized('invalid email or password'));
              });
          }
          else {
            user.sanitize(user);
            return reply(user);
          }
        })
        .catch((err) => {
          that.app.services.ErrorService.handle(err, request, reply);
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
              that.log.warn('Created an API key', {email: result.email, security: true, request: request});
              reply({
                user: result,
                token: token
              });
            })
            .catch((err) => {
              that.app.services.ErrorService.handle(err, request, reply);
            });
        }
        else {
          that.log.info('Successful user authentication. Returning JWT.', {email: result.email, security: true, request: request});
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

        reply.redirect(redirect);
        that.log.info('Successful user authentication. Redirecting.', {email: request.payload.email, security: true, request: request});
      }
      else {
        const params = that.app.services.HelperService.getOauthParams(request.payload);

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
      this.log.warn('Unsuccessful OAuth2 authorization due to missing response_type', {security: true, fail: true, request: request});
      return reply(Boom.badRequest('Missing response_type'));
    }

    // If the user is not authenticated, redirect to the login page and preserve
    // all relevant query parameters.
    const cookie = request.yar.get('session');
    if (!cookie || (cookie && !cookie.userId)) {
      this.log.info('Get request to /oauth/authorize without session. Redirecting to the login page.', {request: request});
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
      .then((user) => {
        const clientId = request.query.client_id;
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
              that.log.warn(
                'Unsuccessful OAuth2 authorization due to wrong redirect URI',
                { security: true, fail: true, request: request}
              );
              return done('Wrong redirect URI');
            }
            return done(null, client, client.redirectUri);
          });
        });
      })
      .catch((err) => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  authorizeOauth2 (request, reply) {
    const User = this.app.orm.User;
    const oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize'];
    const cookie = request.yar.get('session');

    if (!cookie || (cookie && !cookie.userId)) {
      this.log.info('Got request to /oauth/authorize without session. Redirecting to the login page.', {request: request});
      return reply.redirect('/?redirect=/oauth/authorize&client_id=' + request.query.client_id +
        '&redirect_uri=' + request.query.redirect_uri +
        '&response_type=' + request.query.response_type +
        '&state=' + request.query.state +
        '&scope=' + request.query.scope +
        '&nonce=' + request.query.nonce + '#login'
      );
    }

    const that = this;
    User
      .findOne({_id: cookie.userId})
      .then((user) => {
        if (!user) {
          that.log.warn(
            'Unsuccessful OAuth2 authorization attempt. Could not find user with ID ' + cookie.userId,
            {security: true, fail: true, request: request}
          );
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
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  accessTokenOauth2 (request, reply) {
    const oauth = this.app.packs.hapi.server.plugins['hapi-oauth2orize'];
    const OauthToken = this.app.orm.OauthToken;
    const code = request.payload.code;
    if (!code) {
      this.log.warn(
        'Unsuccessful access token request due to missing authorization code.',
        { security: true, fail: true, request: request }
      );
      return reply(Boom.badRequest('Missing authorization code'));
    }
    const that = this;
    OauthToken
      .findOne({token: code, type: 'code'})
      .populate('client user')
      .exec(function (err, ocode) {
        if (err) {
          that.log.warn(
            'Unsuccessful access token request due to wrong authorization code.',
            { security: true, fail: true, request: request, code: code}
          );
          return reply(Boom.badRequest('Wrong authorization code'));
        }
        that.log.info('Successful access token request', { security: true, request: request});
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
        that.app.services.ErrorService.handle(err, request, reply);
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
        return that.app.services.ErrorService.handle(err, request, reply);
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
            that.app.services.ErrorService.handle(err, request, reply);
          });
      }
      else {
        that.log.warn(
          'Tried to blacklist a token by a user who does not have the permission',
          { security: true, fail: true, request: request}
        );
        return reply(Boom.badRequest('Could not blacklist this token because you did not generate it'));
      }
    });
  }


};
