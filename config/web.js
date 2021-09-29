/**
 * Server Configuration
 */
const inert = require('@hapi/inert');
const ejs = require('ejs');
const vision = require('@hapi/vision');
const yar = require('@hapi/yar');
const CatboxRedis = require('@hapi/catbox-redis');
const crumb = require('@hapi/crumb');
const Scooter = require('@hapi/scooter');
const Blankie = require('blankie');
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

  // Server options.
  options: {
    info: {
      // We always want access to request.info.remoteAddress in hapi@19+
      //
      // @see https://github.com/hapijs/hapi/issues/4017
      remote: true,
    },

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

    cache: [
      // HID cannot be highly available unless server-side cookie storage is
      // driven by a shared backend between API containers. We are using
      // Redis because it's already in OCHA infra, and the MongoDB provider
      // is unmaintained.
      {
        name: 'session',
        provider: {
          constructor: CatboxRedis,
          options: {
            partition: 'session',
            host: process.env.REDIS_HOST || 'redis',
            port: process.env.REDIS_PORT || 6379,
            db: process.env.REDIS_DB || '0',
          },
        },
      },
    ],
  },

  // Plugins.
  // They provide vital behaviors: template rendering, CSP, cookie config, etc
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
          // Adopt our server-side cache defined in top-level `options`.
          cache: 'session',

          // 1-week sessions
          expiresIn: 7 * 24 * 60 * 60 * 1000,
        },

        // Force use of backend storage.
        maxCookieSize: 0,

        // Configure how cookies behave in browsers.
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
          const paths = [
            '/',
            '/login',
            '/oauth/authorize',
            '/register',
            '/verify',
            '/password',
            '/new-password',

            // TODO: remove post-deploy
            // @see HID-2219
            '/new_password',
          ];
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
    {
      plugin: Scooter,
    },
    {
      plugin: Blankie,
      // Configure our Content Security Policy (CSP)
      //
      // Note: the double quotes which contain single quotes is not a mistake.
      // That is done intentionally in order to create a valid set of headers.
      options: {
        styleSrc: [
          'self',
          'https://fonts.googleapis.com',
          // These hashes allow the CD SVG sprite to contain inline style blocks.
          // When the sprite is replaced, these likely have to be updated.
          "'sha256-V9AHfwgZGnDP/9HWH+ANrhe++Fn8jBJQ1JVyqSRgb5k='",
          "'sha256-pJeCB2XoDM3l7akAolEPn5aJZEI3d+buFdkCCtUOcBs='",
        ],
        fontSrc: [
          'https://fonts.gstatic.com',
        ],
        scriptSrc: [
          'self',
          // GA allowed, plus anything it wants to cram in afterwards via data:
          'https://www.google-analytics.com',
          'data:',
          // Google reCAPTCHA v2: scripts to load UI. See frameSrc.
          'https://www.google.com',
          'https://www.gstatic.com',
          // These hashes are for GA and our inline JS+feature detection.
          "'sha256-zITkoAg4eI1v3VSFI+ATEQKWvoymQcxmFNojptzmlNw='",
          "'sha256-Ch69wX3la/uD7qfUZRHgam3hofEvI6fesgFgtvG9rTM='",
        ],
        connectSrc: [
          'self',
          'https://www.google-analytics.com',
          'https://stats.g.doubleclick.net',
          // API Docs connect to Stage by default
          'https://stage.api-humanitarian-id.ahconu.org',
        ],
        frameSrc: [
          // Google reCAPTCHA v2: this allows the UI to be displayed
          'https://www.google.com',
        ],
        imgSrc: [
          'self',
          // For 2FA setup, we display a dynamically generated image by inlining
          // base64-encoded QR code. 'data:' allows the image to be displayed.
          'data:',
          // API Docs show a validator image
          'https://validator.swagger.io',
        ],
      },
    },
  ],

  onPluginsLoaded(server) {
    const oauth = server.plugins['hapi-oauth2orize'];
    const OauthExpiresIn = 24 * 3600;

    // Register supported OpenID Connect 1.0 grant types.

    oauth.grant(oauth2orizeExt.extensions());
    // id_token grant type.
    oauth.grant(oauth2orizeExt.grant.idToken((client, user, req, done) => {
      const out = JwtService.generateIdToken(client, user, req.scope, req.nonce);
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
        const out = JwtService.generateIdToken(client, user, req.scope, req.nonce);
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
          const scope = ['openid'];
          return done(null, tokens[1].token, tokens[0].token, {
            expires_in: OauthExpiresIn,
            id_token: JwtService.generateIdToken(client, ocode.user, scope, ocode.nonce),
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
};
