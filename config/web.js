/**
 * Server Configuration
 */
const inert = require('@hapi/inert');
const crypto = require('crypto');
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
const hapiAuthApi = require('../plugins/hapi-auth-api');
const hapiAuthSession = require('../plugins/hapi-auth-session');
const Client = require('../api/models/Client');
const OauthToken = require('../api/models/OauthToken');
const JwtService = require('../api/services/JwtService');

const config = {
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

    // HID cannot be highly available unless server-side cookie storage is
    // driven by a shared backend between API containers. We are using
    // Redis because it's already in OCHA infra, and the MongoDB provider
    // is unmaintained.
    //
    // This cache gets disabled during testing. See modifications section below.
    cache: [{
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
    }],
  },

  // Plugins.
  // They provide vital behaviors: template rendering, CSP, cookie config, etc
  plugins: [
    {
      // Provides static file/directory handlers.
      plugin: inert,
    },
    {
      // Provides template rendering support for Hapi.
      plugin: vision,
    },
    {
      // yar - cookie management
      //
      // Like the cache itself, yar has to modify its behavior in certain
      // environments. The defaults are for production using Redis.
      //
      // See modifications section below.
      plugin: yar,
      options: {
        cache: {
          // Adopt our server-side cache defined in top-level `options`.
          cache: 'session',

          // 1-day sessions
          expiresIn: 24 * 60 * 60 * 1000,
        },

        // Force use of backend storage.
        maxCookieSize: 0,

        // Configure how cookies behave in browsers.
        cookieOptions: {
          password: process.env.COOKIE_PASSWORD || crypto.randomBytes(16).toString('hex'),
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
      plugin: hapiAuthApi,
    },
    {
      plugin: hapiAuthSession,
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
          'self',
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
          'https://www.googletagmanager.com',
          // GTM inline script.
          "'sha256-IWFT2+AzbwEwprR9FTHoZxirn9HBB+bXcjCDQ07yinU='",
          // Inline JS mustard-cut
          "'sha256-/rGLbsC3KREsVOihkt0j7wGku9aMLV2tcrug1R+VUY0='",
        ],
        connectSrc: [
          'self',
          'https://www.google-analytics.com',
          'https://analytics.google.com',
          '*.analytics.google.com',
          'https://stats.g.doubleclick.net',
          'https://fonts.googleapis.com',
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
          'www.google-analytics.com',
          'www.gstatic.com',
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

    // Grant type: 'id_token'
    oauth.grant(oauth2orizeExt.grant.idToken((client, user, req, done) => {
      const out = JwtService.generateIdToken(client, user, req.scope, req.nonce);
      done(null, out);
    }));

    // Grant type: 'id_token token'
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
          promises.push(OauthToken.deleteOne({ type: 'code', token: code }));
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

/**
 * Environment-specific modifications
 *
 * Some config should vary by environment, so we make those adjustments here.
 */

// If we're running unit tests, avoid the Redis cache. Hapi uses an in-memory
// cache by default and that works just fine for testing. The plugin being
// modified is yar.
if (process.env.NODE_ENV === 'test') {
  delete config.options.cache;
  delete config.plugins[2].options.cache.cache;
  delete config.plugins[2].options.cache.maxCookieSize;
}

// Export our config after env-specific modifications.
module.exports = config;
