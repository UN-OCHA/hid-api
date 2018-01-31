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
    if (request.payload && request.payload.list) {
      // Create a Graph client
      const client = microsoftGraph.Client.init({
        authProvider: (done) => {
          // Just return the token
          done(null, token);
        }
      });
      client
        .api('/me')
        .get()
        .then(res => {
          reply(res);
        });
      return;
      const that = this;
      const List = this.app.orm.List;
      const User = this.app.orm.User;
      let gList = {}, folderId = '';
      List
        .findOne({ _id: request.payload.list })
        .then(list => {
          if (!list) {
            throw Boom.notFound();
          }
          gList = list;

          // Get the Graph /Me endpoint to get user email address
          return client
            .api('/me')
            .get();
        })
        .then(res => {
          return client
            .api('/users/' + res.id + '/contactFolders')
            .post({
              displayName: gList.name
            });
        })
        .then(res => {
          const criteria = {};
          if (gList.isVisibleTo(request.params.currentUser)) {
            criteria[gList.type + 's'] = {$elemMatch: {list: gList._id, deleted: false}};
            if (!gList.isOwner(request.params.currentUser)) {
              criteria[gList.type + 's'].$elemMatch.pending = false;
            }
          }
          folderId = res.id;
          return User
            .find(criteria)
            .sort('name')
            .lean();
        })
        .then(users => {
          let promises = [];
          users.forEach(function (elt) {
            let emails = [];
            elt.emails.forEach(function (email) {
              emails.push({
                address: email.email,
                name: elt.name
              });
            });
            promises.push(client
              .api('/me/contactFolders/' + folderId + '/contacts')
              .post({
                givenName: elt.given_name,
                surname: elt.family_name,
                emailAddresses: emails
              })
            );
          });
          return Promise.all(promises);
        })
        .then(data => {
          reply().code(204);
        })
        .catch(err => {
          console.log(err);
          that.app.services.ErrorService.handle(err, request, reply);
        });
      }
      else {
        return reply(Boom.badRequest());
      }
  }

};
