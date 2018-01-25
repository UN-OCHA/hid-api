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
        scope: 'openid offline_access User.Read Contacts.ReadWrite'
      }, function (error, result) {
        if (error) {
          that.app.services.ErrorService.handle(error, request, reply);
        }
        else {
          const token = oauth2.accessToken.create(result);
          console.log(token);
          if (token && token.token && token.token.refresh_token) {
            request.params.currentUser.outlookCredentials = token.token;
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

  getAccessToken (credentials) {
    const expiration = new Date(credentials.expires_at);

    if (expiration <= new Date()) {
      // Refresh access token
      const accessToken = oauth2.accessToken.create({refresh_token: credentials.refresh_token}).refresh();
      return accessToken.access_token;
    }
    else {
      return credentials.access_token;
    }
  }

  create (request, reply) {
    const token = this.getAccessToken(request.params.currentUser.outlookCredentials);
      // Create a Graph client
    const client = microsoftGraph.Client.init({
      authProvider: (done) => {
        // Just return the token
        done(null, token);
      }
    });

    // Get the Graph /Me endpoint to get user email address
    client
      .api('/me')
      .get()
      .then(res => {
        return client
          .api('/user/' + res.id + '/contactFolders')
          .post({
            displayName: 'Humanitarian ID Test'
          });
      })
      .then(res => {
        reply(res);
      })
      .catch(err => {
        console.log(err);
        reply(err);
      });
  }

};
