const Oauth2orize = require('oauth2orize');
const Boom = require('@hapi/boom');
const Hoek = require('hoek');
const Url = require('url');
const util = require('util');

const internals = {
  defaults: {
    credentialsUserProperty: 'user',
  },
  OauthServer: null,
  settings: null,
  grant(type, phase, fn) {
    internals.OauthServer.grant(type, phase, fn);
  },
  exchange(type, exchange) {
    internals.OauthServer.exchange(type, exchange);
  },
  errorHandler(options) {
    return internals.OauthServer.errorHandler(options);
  },
  async authorize(request, reply, options, validate, immediate) {
    const express = internals.convertToExpress(request, reply);
    const authorizeAsync = util.promisify(
      internals.OauthServer.authorize(options, validate, immediate),
    );

    await authorizeAsync(express.req, express.res);
    return [express.req, express.res];
  },
  async decision(request, reply, aoptions, parse) {
    const express = internals.convertToExpress(request, reply);

    const options = aoptions || {};

    if (options && options.loadTransaction === false) {
      const decisionAsync = util.promisify(internals.OauthServer.decision(options, parse));
      return decisionAsync(express.req, express.res);
    }
    const result = internals.OauthServer.decision(options, parse);
    const transactionLoaderAsync = util.promisify(result[0]);
    const middlewareAsync = util.promisify(result[1]);
    await transactionLoaderAsync(express.req, express.res);
    const response = await middlewareAsync(express.req, express.res);
    return response;
  },
  serializeClient(fn) {
    internals.OauthServer.serializeClient(fn);
  },
  deserializeClient(fn) {
    internals.OauthServer.deserializeClient(fn);
  },
  token(request, reply, options) {
    const express = internals.convertToExpress(request, reply);
    const tokenAsync = util.promisify(internals.OauthServer.token(options));
    return tokenAsync(express.req, express.res);
  },
  transformBoomError(aboomE, authE) {
    const boomE = aboomE;
    if (!boomE.isBoom) {
      return boomE;
    }

    const overrides = authE || boomE.data || {};

    Hoek.merge(boomE.output.payload, overrides);

    const origBoomMessage = boomE.output.payload.message;

    if (!boomE.output.payload.error_description && boomE.output.payload.message) {
      boomE.output.payload.error_description = boomE.output.payload.message;
    }

    // Hide server errors however Boom does it
    if (boomE.output.statusCode === 500
      || boomE.output.payload.error === 'server_error') {
      boomE.output.payload.error_description = origBoomMessage;
    }

    delete boomE.output.payload.message;
    delete boomE.output.payload.statusCode;

    return boomE;
  },
  oauthToBoom(oauthError) {
    // These little bits of code are stolen from oauth2orize
    // to translate raw Token/AuthorizationErrors to OAuth2 style errors

    let newResponse = {};
    newResponse.error = oauthError.code || 'server_error';
    if (oauthError.message) {
      newResponse.error_description = oauthError.message;
    }
    if (oauthError.uri) {
      newResponse.error_uri = oauthError.uri;
    }

    // These little bits of code Boomify raw OAuth2 style errors
    newResponse = Boom.boomify(oauthError, { statusCode: oauthError.status });
    internals.transformBoomError(newResponse);

    return newResponse;
  },
  convertToExpress(request, reply) {
    request.yar.lazy(true);

    const ExpressServer = {
      req: {
        session: request.yar,
        query: request.query,
        body: request.payload,
        user: Hoek.reach(request.auth.credentials, internals.settings.credentialsUserProperty || '',
          { default: request.auth.credentials }),
      },
      res: {
        redirect(auri) {
          let uri = auri;
          // map errors in URL to be similar to our custom Boom errors.
          const uriObj = Url.parse(uri, true);

          if (uriObj.query.error) {
            // Hide detailed server error messages
            if (uriObj.query.error === 'server_error') {
              uriObj.query.error_description = 'An internal server error occurred';
            }

            uri = Url.format(uriObj);
          }

          return reply.redirect(uri);
        },
        setHeader(header, value) {
          ExpressServer.headers.push([header, value]);
        },
        end(acontent) {
          let content = acontent;
          // Transform errors to be handled as Boomers
          if (typeof content === 'string') {
            let jsonContent;
            try {
              jsonContent = JSON.parse(content);
            } catch (e) {
              /* If we got a json error, ignore it.
              * The oauth2orize's response just wasn't json.
              */
            }

            // If we have a json response and it's an error, let's Boomify/normalize it!
            if (jsonContent) {
              if (jsonContent.error && this.statusCode) {
                content = Boom.create(this.statusCode, null, jsonContent);

                // Transform Boom error using jsonContent data attached to it
                internals.transformBoomError(content);

                // Now that we have a Boom object, we can let Hapi handle headers and status codes
                ExpressServer.headers = [];
                this.statusCode = null;
              } else {
                // Respond non-error content as a json object if it is json.
                content = jsonContent;
              }
            }
          }

          const response = reply.response(content);

          // Non-boom error fallback
          ExpressServer.headers.forEach((element) => {
            response.header(element[0], element[1]);
          });

          if (this.statusCode) {
            response.code(this.statusCode);
          }
          return response;
        },
      },
      headers: [],
    };

    return ExpressServer;
  },
};

module.exports = {
  name: 'hapi-oauth2orize',
  version: '1.0.0',
  register(server, options) {
    // Need session support for transaction in authorization code grant
    server.dependency('yar');

    internals.settings = Hoek.applyToDefaults(internals.defaults, options);

    internals.OauthServer = Oauth2orize.createServer();

    server.expose('server', internals.OauthServer);
    server.expose('settings', internals.settings);
    server.expose('grant', internals.grant);
    server.expose('grants', Oauth2orize.grant);
    server.expose('exchange', internals.exchange);
    server.expose('exchanges', Oauth2orize.exchange);
    server.expose('authorize', internals.authorize);
    server.expose('decision', internals.decision);
    server.expose('token', internals.token);
    server.expose('errorHandler', internals.errorHandler);
    server.expose('oauthToBoom', internals.oauthToBoom);
    server.expose('errors', {
      AuthorizationError: Oauth2orize.AuthorizationError,
      TokenError: Oauth2orize.TokenError,
    });
    server.expose('serializeClient', internals.serializeClient);
    server.expose('deserializeClient', internals.deserializeClient);

    // Catch raw Token/AuthorizationErrors and turn them into legit OAuthified Boom errors
    server.ext('onPreResponse', (request, reply) => {
      const { response } = request;

      let newResponse;

      // Catch raw Token/AuthorizationErrors and process them
      if (response instanceof Oauth2orize.TokenError
        || response instanceof Oauth2orize.AuthorizationError) {
        newResponse = internals.oauthToBoom(response);
      }

      if (newResponse) {
        throw newResponse;
      } else {
        return reply.continue;
      }
    });
  },
};
