'use strict';

const Boom = require('boom');
const {google} = require('googleapis');
const {OAuth2Client} = require('google-auth-library');
const fs = require('fs');
const GSSSync = require('../models/GSSSync');
const ErrorService = require('../services/ErrorService');
const GSSSyncService = require('../services/GSSSyncService');

/**
 * @module GSSSyncController
 * @description Generated Trails.js Controller.
 */
function createHelper (request, reply) {
 let gsync = {};
 GSSSync
   .create(request.payload)
   .then((gsssync) => {
     if (!gsssync) {
       throw Boom.badRequest();
     }
     gsync = gsssync;
     return GSSSyncService.synchronizeAll(gsssync);
   })
   .then((resp) => {
     reply (gsync);
   })
   .catch(err => {
     ErrorService.handle(err, request, reply);
   });
}

module.exports = {

  create: function (request, reply) {
    request.payload.user = request.params.currentUser._id;
    if (!request.payload.spreadsheet) {
      GSSSyncService.createSpreadsheet(request.params.currentUser, request.payload.list, function (err, spreadsheet) {
        if (err) {
          return ErrorService.handle(err, request, reply);
        }
        request.payload.spreadsheet = spreadsheet.data.spreadsheetId;
        request.payload.sheetId = spreadsheet.data.sheets[0].properties.sheetId;
        createHelper(request, reply);
      });
    }
    else {
      createHelper(request, reply);
    }
  },

  saveGoogleCredentials: function (request, reply) {
    if (request.payload.code) {
      const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
      const authClient = new OAuth2Client(creds.web.client_id, creds.web.client_secret, 'postmessage');
      authClient
        .getToken(request.payload.code, function (err, tokens) {
          if (err) {
            return ErrorService.handle(err, request, reply);
          }
          if (tokens && tokens.refresh_token) {
            request.params.currentUser.googleCredentials = tokens;
            request.params.currentUser.save();
            reply().code(204);
          }
          else {
            const noRefreshToken = Boom.badRequest('No refresh token');
            ErrorService.handle(noRefreshToken, request, reply);
          }
        });
    }
    else {
      return reply(Boom.badRequest());
    }
  },

  destroy: function (request, reply) {
    GSSSync
      .remove({ _id: request.params.id })
      .then(() => {
        reply().code(204);
      })
      .catch(err => {
        ErrorService.handle(err, request, reply);
      });
  }
};
