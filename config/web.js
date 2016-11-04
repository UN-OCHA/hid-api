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
