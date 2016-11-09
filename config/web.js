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
    const oauth = this.packs.hapi.server.plugins['hapi-oauth2orize'];
    const Client = this.orm.Client
    const OauthCode = this.orm.OauthCode
    const OauthAccessToken = this.orm.OauthAccessToken
    // Implicit Grant Flow
    oauth.grant(oauth.grants.token(function (client, user, ares, done) {
      OauthAccessToken.generate(function (err, token) {
        if (err) return done(err)
        var expires = new Date();
        expires.setSeconds(expires.getSeconds() + 3600);
        var ftoken = {
          token: token,
          client: client._id,
          user: user._id,
          expires: expires
        };
        OauthAccessToken.create(ftoken, function (err, tok) {
          if (err) done(err)
          done(null, tok._id, {expires_in: 3600})
        })
      })
    }));
    // Authorization code exchange flow
    oauth.grant(oauth.grants.code(function (client, redirectURI, user, ares, done) {
      OauthCode.generateCode(function (err, code) {
        if (err) return done(err)
        var expires = new Date();
        expires.setSeconds(expires.getSeconds() + 3600);
        var token = {
          code: code,
          client: client._id,
          user: user._id,
          nonce: '',
          expires: expires
        };
        OauthCode.create(token, function (err, tok) {
          if (err) done (err)
          done(null, tok.code)
        })
      });
    }));

    oauth.exchange(oauth.exchanges.code(function (client, code, redirectURI, done) {
      
      /*server.helpers.find('code', code, function (code) {
        if (!code || client.id !== code.client || redirectURI !== code.redirectURI) {
          return done(null, false);
        }
        server.helpers.insert('refreshToken', {
          client: code.client,
          principal: code.principal,
          scope: code.scope
        }, function (refreshToken) {
          server.helpers.insert('token', {
            client: code.client,
            principal: code.principal,
            scope: code.scope,
            created: Date.now(),
            expires_in: 3600
          }, function (token) {
            server.helpers.remove('code', code._id, function () {
              done(null, token._id, refreshToken._id, {expires_in: token.expires_in});
            });
          });
        });
      });*/
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
