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

module.exports = {

  create: async function (request, reply) {
    request.payload.user = request.params.currentUser._id;
    try {
      if (!request.payload.spreadsheet) {
        const spreadsheet = await GSSSyncService.createSpreadsheet(request.params.currentUser, request.payload.list);
        request.payload.spreadsheet = spreadsheet.data.spreadsheetId;
        request.payload.sheetId = spreadsheet.data.sheets[0].properties.sheetId;
      }
      const gsssync = await GSSSync.create(request.payload);
      if (!gsssync) {
        throw Boom.badRequest();
      }
      await GSSSyncService.synchronizeAll(gsssync);
      return reply(gsssync);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  saveGoogleCredentials: async function (request, reply) {
    try {
      if (request.payload.code) {
        const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
        const authClient = new OAuth2Client(creds.web.client_id, creds.web.client_secret, 'postmessage');
        const tokens = await authClient.getToken(request.payload.code);
        if (tokens && tokens.refresh_token) {
          request.params.currentUser.googleCredentials = tokens;
          request.params.currentUser.save();
          return reply().code(204);
        }
        else {
          throw Boom.badRequest('No refresh token');
        }
      }
      else {
        throw Boom.badRequest();
      }
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  },

  destroy: async function (request, reply) {
    try {
      await GSSSync.remove({ _id: request.params.id });
      reply().code(204);
    }
    catch (err) {
      ErrorService.handle(err, request, reply);
    }
  }
};
