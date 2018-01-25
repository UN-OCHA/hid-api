'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const fs = require('fs');
const credentials = JSON.parse(fs.readFileSync('keys/outlook.json'));
const oauth2 = require('simple-oauth2').create(credentials);
const microsoftGraph = require('@microsoft/microsoft-graph-client');

/**
 * @module OutlookController
 * @description Generated Trails.js Controller.
 */
module.exports = class OutlookController extends Controller{

  saveOutlookCredentials (request, reply) {
    const that = this;
    if (request.payload.code && request.payload.redirectUri) {
      oauth2.authorizationCode.getToken({
        code: request.payload.code,
        redirect_uri: request.payload.redirectUri,
        scope: 'openid offline_access User.Read'
      }, function (error, result) {
        if (error) {
          that.app.services.ErrorService.handle(error, request, reply);
        }
        else {
          const token = oauth2.accessToken.create(result);
          if (token && token.refresh_token) {
            request.params.currentUser.outlookCredentials = token;
            request.params.currentUser.save();
            reply().code(204);
          }
          else {
            const noRefreshToken = Boom.badRequest('No refresh token');
            that.app.services.ErrorService.handle(noRefreshToken, request, reply);
          }
        }
      });
    }
    else {
      return reply(Boom.badRequest());
    }
  }

  create (request, reply) {
    const token = request.params.currentUser.outlookCredentials.access_token;
      // Create a Graph client
    const client = microsoftGraph.Client.init({
      authProvider: (done) => {
        // Just return the token
        done(null, token);
      }
    });

    // Get the Graph /Me endpoint to get user email address
    const res = client
      .api('/me')
      .get()
      .then(res => {
        console.log(res);
        //const email = res.mail ? res.mail : res.userPrincipalName;
        reply(res);
      })
      .catch(err => {
        console.log(err);
        reply(err);
      });
  }

};
