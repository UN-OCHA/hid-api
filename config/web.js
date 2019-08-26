/**
* Server Configuration
* (app.config.web)
*
* Configure the Web Server
*
* @see {@link http://trailsjs.io/doc/config/web}
*/
const inert = require('inert');
const ejs = require('ejs');
const vision = require('vision');
const yar = require('yar');
const crumb = require('crumb');
const hapiRateLimit = require('hapi-rate-limit');
const oauth2orizeExt = require('oauth2orize-openid');
const hapiOauth2Orize = require('../plugins/hapi-oauth2orize');
const hapiAuthHid = require('../plugins/hapi-auth-hid');
const Client = require('../api/models/Client');
const OauthToken = require('../api/models/OauthToken');
const JwtService = require('../api/services/JwtService');

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
      html: ejs,
    },
    path: 'templates',
  },

  plugins: [
    {
      plugin: inert,
    },
    {
      plugin: vision,
    },
    {
      plugin: yar,
      options: {
        cache: {
          expiresIn: 4 * 60 * 60 * 1000, // 4 hours sessions
        },
        cookieOptions: {
          password: process.env.COOKIE_PASSWORD,
          isSecure: process.env.NODE_ENV === 'production',
          isHttpOnly: true,
        },
      },
    },
    {
      plugin: crumb,
      options: {
        cookieOptions: {
          isSecure: process.env.NODE_ENV === 'production',
        },
        skip(request) {
          const paths = ['/', '/login', '/oauth/authorize',
            '/register', '/verify', '/verify2', '/password', '/new_password'];
          if (paths.indexOf(request.path) === -1) {
            return true;
          }
          return false;
        },
      },
    },
    {
      plugin: hapiOauth2Orize,
    },
    {
      plugin: hapiRateLimit,
      options: {
        userLimit: 100000,
        trustProxy: true,
        pathLimit: false,
      },
    },
    {
      plugin: hapiAuthHid,
    },
  ],

  onPluginsLoaded(server) {
    const oauth = server.plugins['hapi-oauth2orize'];
    const OauthExpiresIn = 24 * 3600;

    // Register supported OpenID Connect 1.0 grant types.

    oauth.grant(oauth2orizeExt.extensions());
    // id_token grant type.
    oauth.grant(oauth2orizeExt.grant.idToken((client, user, res, done) => {
      const out = JwtService.generateIdToken(client, user);
      done(null, out);
    }));

    // 'id_token token' grant type.
    oauth.grant(oauth2orizeExt.grant.idTokenToken(
      async (client, user, done) => {
        try {
          const token = OauthToken.generate('access', client, user, '');
          const tok = await OauthToken.create(token);
          return done(null, tok.token);
        } catch (err) {
          return done(err);
        }
      },
      (client, user, req, done) => {
        const out = JwtService.generateIdToken(client, user);
        return done(null, out);
      },
    ));

    // Implicit Grant Flow
    oauth.grant(oauth.grants.token(async (client, user, ares, done) => {
      try {
        const token = OauthToken.generate('access', client, user, '');
        const tok = await OauthToken.create(token);
        return done(null, tok.token, { expires_in: OauthExpiresIn });
      } catch (err) {
        return done(err);
      }
    }));
    // Authorization code exchange flow
    oauth.grant(oauth.grants.code(async (client, redirectURI, user, res, req, done) => {
      const nonce = req.nonce ? req.nonce : '';
      try {
        const token = OauthToken.generate('code', client, user, nonce);
        const tok = await OauthToken.create(token);
        return done(null, tok.token);
      } catch (err) {
        return done(err);
      }
    }));

    oauth.exchange(oauth.exchanges.code(
      async (client, code, redirectURI, payload, authInfo, done) => {
        try {
          const ocode = await OauthToken
            .findOne({ token: code, type: 'code' })
            .populate('client user');
          if (!ocode.client._id.equals(client._id)) {
            return done(null, false);
          }
          const promises = [];
          const refreshToken = OauthToken.generate('refresh', client, ocode.user, ocode.nonce);
          const accessToken = OauthToken.generate('access', client, ocode.user, ocode.nonce);
          promises.push(OauthToken.create(refreshToken));
          promises.push(OauthToken.create(accessToken));
          promises.push(OauthToken.remove({ type: 'code', token: code }));
          const tokens = await Promise.all(promises);
          return done(null, tokens[1].token, tokens[0].token, {
            expires_in: OauthExpiresIn,
            id_token: JwtService.generateIdToken(client, ocode.user, ocode.nonce),
          });
        } catch (err) {
          return done(err);
        }
      },
    ));

    oauth.exchange(oauth.exchanges.refreshToken(async (client, refreshToken, scope, done) => {
      try {
        const tok = await OauthToken
          .findOne({ type: 'refresh', token: refreshToken })
          .populate('client user');
        if (tok.client._id.toString() !== client._id.toString()) {
          return done(null, false, { message: 'This refresh token is for a different client' });
        }
        const atoken = OauthToken.generate('access', tok.client, tok.user, tok.nonce);
        const ctok = await OauthToken.create(atoken);
        return done(null, ctok.token, null, { expires_in: OauthExpiresIn });
      } catch (err) {
        return done(err);
      }
    }));

    // Client Serializers
    oauth.serializeClient((client, done) => {
      done(null, client._id);
    });

    oauth.deserializeClient(async (id, done) => {
      try {
        const client = await Client.findOne({ _id: id });
        return done(null, client);
      } catch (err) {
        return done(err);
      }
    });
  },

  options: {
    routes: {
      cors: {
        additionalExposedHeaders: ['X-Total-Count', 'set-cookie'],
        additionalHeaders: ['Accept-Language', 'X-HID-TOTP'],
        credentials: true, // Allow the x-hid-totp-trust cookie to be sent
      },
      payload: {
        maxBytes: 5242880,
      },
      security: {
        xframe: true,
      },
    },
  },
};
