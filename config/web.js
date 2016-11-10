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
        cookieOptions: {
          password: process.env.COOKIE_PASSWORD,
          isSecure: process.env.NODE_ENV === 'production'
        }
      }
    },
    {
      register: require('hapi-oauth2orize'),
      options: { }
    }
  ],

  onPluginsLoaded: function (err) {
    const async = require('async')
    const oauth = this.packs.hapi.server.plugins['hapi-oauth2orize'];
    const Client = this.orm.Client
    const OauthToken = this.orm.OauthToken
    // Implicit Grant Flow
    oauth.grant(oauth.grants.token(function (client, user, ares, done) {
      OauthToken.generate(function (err, token) {
        if (err) return done(err)
        var expires = new Date();
        expires.setSeconds(expires.getSeconds() + 3600);
        var ftoken = {
          type: 'access',
          token: token,
          client: client._id,
          user: user._id,
          expires: expires
        };
        OauthToken.create(ftoken, function (err, tok) {
          if (err) done(err)
          done(null, tok.token, {expires_in: 3600})
        })
      })
    }));
    // Authorization code exchange flow
    oauth.grant(oauth.grants.code(function (client, redirectURI, user, ares, done) {
      OauthToken.generate(function (err, code) {
        if (err) return done(err)
        var expires = new Date();
        expires.setSeconds(expires.getSeconds() + 3600);
        var token = {
          type: 'code',
          token: code,
          client: client._id,
          user: user._id,
          nonce: '',
          expires: expires
        };
        OauthToken.create(token, function (err, tok) {
          if (err) done (err)
          done(null, tok.token)
        })
      });
    }));

    oauth.exchange(oauth.exchanges.code(function (client, code, redirectURI, done) {
      console.log(client)
      OauthToken
        .findOne({token: code, type: 'code'})
        .populate('client user')
        .exec(function (err, ocode) {
          var client = ocode.client
          /*if (err || ocode.client._id !== client._id || redirectURI !== ocode.client.redirectUri) {
            return done(null, false);
          }*/
          var expires = new Date();
          expires.setSeconds(expires.getSeconds() + 3600);
          async.auto({
            // Create refresh token
            refreshToken: function (callback) {
              OauthToken.generate(function (err, token) {
                if (err) return callback(err)
                var ftoken = {
                  type: 'refresh',
                  token: token,
                  client: client._id,
                  user: ocode.user._id,
                  expires: expires
                };
                OauthToken.create(ftoken, function (err, tok) {
                  if (err) return callback(err)
                  callback(null, tok)
                });
              });
            },
            // Create access token
            accessToken: function (callback) {
              OauthToken.generate(function (err, token) {
                if (err) return callback(err)
                var ftoken = {
                  type: 'access',
                  token: token,
                  client: client._id,
                  user: ocode.user._id,
                  expires: expires
                };
                OauthToken.create(ftoken, function (err, tok) {
                  if (err) return callback(err)
                  callback(null, tok)
                });
              });
            },
            // Delete code token
            deleteCode: function (callback) {
              OauthToken.remove({type: 'code', token: code}, function (err) {
                if (err) return callback(err)
                callback()
              });
            }
          }, function (err, results) {
            if (err) return done(err)
            done(null, results.accessToken.token, results.refreshToken.token, {expires_in: 3600})
          }
        );
      });
    }));

    oauth.exchange(oauth.exchanges.refreshToken(function (client, refreshToken, scope, done) {
      var expires = new Date();
      expires.setSeconds(expires.getSeconds() + 3600);
      OauthToken
        .findOne({type: 'refresh', token: refreshToken})
        .populate('client user')
        .exec(function (err, tok) {
          if (err) return done(err)
          if (tok.client._id !== client._id) {
            return done(null, false, { message: 'This refresh token is for a different client'});
          }
          OauthToken.generate(function (err, atok) {
            if (err) return done(err)
            var atoken = {
              type: 'access',
              token: atok,
              user: tok.user._id,
              client: tok.client._id,
              expires: expires
            }
            OauthToken.create(atoken, function (err, ctok) {
              if (err) return done(err)
              done(null, ctok.token, null, {expires_in: 3600});
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
        if (err) return done(err)
        done(null, client)
      });
    });
  },

  options: {
    routes: {
      cors: {
        additionalExposedHeaders: [ 'X-Total-Count' ]
      }
    }
  }
}
