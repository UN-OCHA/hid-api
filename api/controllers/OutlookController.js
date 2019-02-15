'use strict';

const Boom = require('boom');
const fs = require('fs');
const microsoftGraph = require('@microsoft/microsoft-graph-client');
const OutlookSync = require('../models/OutlookSync');
const List = require('../models/List');
const User = require('../models/User');

/**
 * @module OutlookController
 * @description Generated Trails.js Controller.
 */
module.exports = {

  saveOutlookCredentials: async function (request, reply) {
    const credentials = JSON.parse(fs.readFileSync('keys/outlook.json'));
    const oauth2 = require('simple-oauth2').create(credentials);
    if (request.payload.code && request.payload.redirectUri) {
      const result = await oauth2.authorizationCode.getToken({
        code: request.payload.code,
        redirect_uri: request.payload.redirectUri,
        scope: 'openid offline_access User.Read Contacts.ReadWrite'
      });
      const token = oauth2.accessToken.create(result);
      if (token && token.token && token.token.refresh_token) {
        request.auth.credentials.outlookCredentials = token.token;
        await request.auth.credentials.save();
        return reply.response().code(204);
      }
      else {
        throw Boom.badRequest('No refresh token');
      }
    }
    else {
      throw Boom.badRequest();
    }
  },

  create: async function (request, reply) {
    const appCreds = JSON.parse(fs.readFileSync('keys/outlook.json'));
    const oauth2 = require('simple-oauth2').create(appCreds);
    const credentials = request.auth.credentials.outlookCredentials;
    if (request.payload && request.payload.list) {
      let accessToken = '', client = {};
      const gList = {}, gOsync = {};
      const sync = await OutlookSync.findOne({user: request.auth.credentials._id, list: request.payload.list});
      if (sync) {
        throw Boom.conflict('Contact folder already exists');
      }
      const res = await oauth2.accessToken.create({refresh_token: credentials.refresh_token}).refresh();
      accessToken = res.token.access_token;
      // Create a Graph client
      client = microsoftGraph.Client.init({
        authProvider: (done) => {
          // Just return the token
          done(null, accessToken);
        }
      });
      const list = await List.findOne({_id: request.payload.list});
      if (!list) {
        throw Boom.notFound();
      }
      const cRes = await client
        .api('/me/contactFolders')
        .post({
          displayName: gList.name
        });
      const osync = await OutlookSync
        .create({
          list: gList._id,
          user: request.auth.credentials._id,
          folder: cRes.id
        });

      const criteria = {};
      if (gList.isVisibleTo(request.auth.credentials)) {
        criteria[gList.type + 's'] = {$elemMatch: {list: gList._id, deleted: false}};
        if (!gList.isOwner(request.auth.credentials)) {
          criteria[gList.type + 's'].$elemMatch.pending = false;
        }
      }
      const users = await User.find(criteria).sort('name').lean();
      const promises = [];
      users.forEach(function (elt) {
        const emails = [];
        elt.emails.forEach(function (email) {
          emails.push({
            address: email.email,
            name: elt.name
          });
        });
        promises.push(client
          .api('/me/contactFolders/' + gOsync.folder + '/contacts')
          .post(gOsync.getContact(elt))
        );
      });
      await Promise.all(promises);
      return osync;
    }
    else {
      throw Boom.badRequest();
    }
  }

};
