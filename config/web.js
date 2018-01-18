/**
 * Server Configuration
 * (app.config.web)
 *
 * Configure the Web Server
 *
 * @see {@link http://trailsjs.io/doc/config/web}
 */
module.exports = {

  /**
   * The port to bind the web server to
   */
  port: process.env.PORT || 3000,

  /**
   * The host to bind the web server to
   */
  host: process.env.HOST || '0.0.0.0',

  views: {
    engines: {
      html: require('ejs')
    },
    path: 'templates'
  },

  plugins: [
    {
      register: require('yar'),
      options: {
        cache: {
          expiresIn: 4 * 60 * 60 * 1000 // 4 hours sessions
        },
        cookieOptions: {
          password: process.env.COOKIE_PASSWORD,
          isSecure: process.env.NODE_ENV === 'production',
          isHttpOnly: true
        }
      }
    },
    {
      register: require('crumb'),
      options: {
        skip: function (request, reply) {
          const paths = ['/', '/login', '/oauth/authorize',
            '/register', '/verify', '/verify2', '/password', '/new_password'];
          if (paths.indexOf(request.path) === -1) {
            return true;
          }
          return false;
        }
      }
    },
    {
      register: require('hapi-oauth2orize'),
      options: { }
    },
    {
      register: require('hapi-rate-limit'),
      options: {
        userLimit: 100000,
        trustProxy: true,
        pathLimit: false
      }
    }
  ],

  onPluginsLoaded: function (err) {
    const async = require('async');
    const oauth = this.packs.hapi.server.plugins['hapi-oauth2orize'];
    const oauth2orizeExt = require('oauth2orize-openid');
    const Client = this.orm.Client;
    const OauthToken = this.orm.OauthToken;
    const OauthExpiresIn = 7 * 24 * 3600;

    const that = this;
    // Register supported OpenID Connect 1.0 grant types.

    oauth.grant(oauth2orizeExt.extensions());
    // id_token grant type.
    oauth.grant(oauth2orizeExt.grant.idToken(function(client, user, done){
      const out = that.services.JwtService.generateIdToken(client, user);
      done(null, out);
    }));

    // 'id_token token' grant type.
    oauth.grant(oauth2orizeExt.grant.idTokenToken(
      function(client, user, done){
        OauthToken.generate('access', client, user, '', function (err, token) {
          if (err) {
            return done(err);
          }
          OauthToken.create(token, function (err, tok) {
            if (err) {
              done(err);
            }
            done (null, tok.token);
          });
        });
      },
      function(client, user, req, done){
        const out = that.services.JwtService.generateIdToken(client, user);
        done (null, out);
      }
    ));

    // Implicit Grant Flow
    oauth.grant(oauth.grants.token(function (client, user, ares, done) {
      OauthToken.generate('access', client, user, '', function (err, token) {
        if (err) {
          return done(err);
        }
        OauthToken.create(token, function (err, tok) {
          if (err) {
            done(err);
          }
          done(null, tok.token, {expires_in: OauthExpiresIn});
        });
      });
    }));
    // Authorization code exchange flow
    oauth.grant(oauth.grants.code(function (client, redirectURI, user, res, req, done) {
      const nonce = req.nonce ? req.nonce : '';
      OauthToken.generate('code', client, user, nonce, function (err, code) {
        if (err) {
          return done(err);
        }
        OauthToken.create(code, function (err, tok) {
          if (err) {
            done (err);
          }
          done(null, tok.token);
        });
      });
    }));

    oauth.exchange(
      oauth.exchanges.code(function (client, code, redirectURI, payload, authInfo, done) {
        OauthToken
          .findOne({token: code, type: 'code'})
          .populate('client user')
          .exec(function (err, ocode) {
            if (err ||
              !ocode.client._id.equals(client._id)) {
              //redirectURI !== ocode.client.redirectUri) {
              return done(null, false);
            }
            async.auto({
              // Create refresh token
              refreshToken: function (callback) {
                OauthToken.generate('refresh', client, ocode.user, ocode.nonce, function (err, token) {
                  if (err) {
                    return callback(err);
                  }
                  OauthToken.create(token, function (err, tok) {
                    if (err) {
                      return callback(err);
                    }
                    callback(null, tok);
                  });
                });
              },
              // Create access token
              accessToken: function (callback) {
                OauthToken.generate('access', client, ocode.user, ocode.nonce, function (err, token) {
                  if (err) {
                    return callback(err);
                  }
                  OauthToken.create(token, function (err, tok) {
                    if (err) {
                      return callback(err);
                    }
                    callback(null, tok);
                  });
                });
              },
              idToken: function (callback) {
                const out = {};
                out.token = that.services.JwtService.generateIdToken(client, ocode.user, ocode.nonce);
                callback(null, out);
              },
              // Delete code token
              deleteCode: function (callback) {
                OauthToken.remove({type: 'code', token: code}, function (err) {
                  if (err) {
                    return callback(err);
                  }
                  callback();
                });
              }
            }, function (err, results) {
              if (err) {
                return done(err);
              }
              done(null, results.accessToken.token, results.refreshToken.token, {
                expires_in: OauthExpiresIn,
                id_token: results.idToken.token
              });
            });
          });
      })
    );

    oauth.exchange(oauth.exchanges.refreshToken(function (client, refreshToken, scope, done) {
      OauthToken
        .findOne({type: 'refresh', token: refreshToken})
        .populate('client user')
        .exec(function (err, tok) {
          if (err) {
            return done(err);
          }
          if (tok.client._id !== client._id) {
            return done(null, false, { message: 'This refresh token is for a different client'});
          }
          OauthToken.generate('access', tok.client, tok.user, tok.nonce, function (err, atoken) {
            if (err) {
              return done(err);
            }
            OauthToken.create(atoken, function (err, ctok) {
              if (err) {
                return done(err);
              }
              done(null, ctok.token, null, {expires_in: OauthExpiresIn});
            });
          });
        });
    }));

    // Client Serializers
    oauth.serializeClient(function (client, done) {
      done(null, client._id);
    });

    oauth.deserializeClient(function (id, done) {
      Client.findOne({_id: id}, function (err, client) {
        if (err) {
          return done(err);
        }
        done(null, client);
      });
    });
  },

  options: {
    routes: {
      cors: {
        additionalExposedHeaders: [ 'X-Total-Count', 'set-cookie' ],
        additionalHeaders: ['Accept-Language', 'X-HID-TOTP'],
        credentials: true // Allow the x-hid-totp-trust cookie to be sent
      },
      payload: {
        maxBytes: 5242880
      },
      security: {
        xframe: true
      }
    }
  },

  extensions: [
    {
      type: 'onPreResponse',
      method (request, reply) {
        if (request.response.isBoom) {
          request.response.output.headers['X-Powered-By'] = '';
        }
        else if (request.response.header) {
          request.response.header('X-Powered-By', '');
        }

        reply.continue();
      }
    }
  ]
};
