'use strict';

const Boom = require('boom');
const {OAuth2Client} = require('google-auth-library');
const fs = require('fs');
const GSSSync = require('../models/GSSSync');
const GSSSyncService = require('../services/GSSSyncService');

/**
 * @module GSSSyncController
 * @description Generated Trails.js Controller.
 */

module.exports = {

  create: async function (request, reply) {
    request.payload.user = request.auth.credentials._id;
    if (!request.payload.spreadsheet) {
      const spreadsheet = await GSSSyncService.createSpreadsheet(request.auth.credentials, request.payload.list);
      request.payload.spreadsheet = spreadsheet.data.spreadsheetId;
      request.payload.sheetId = spreadsheet.data.sheets[0].properties.sheetId;
    }
    const gsssync = await GSSSync.create(request.payload);
    if (!gsssync) {
      throw Boom.badRequest();
    }
    await GSSSyncService.synchronizeAll(gsssync);
    return gsssync;
  },

  saveGoogleCredentials: async function (request, reply) {
    if (request.payload.code) {
      const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
      const authClient = new OAuth2Client(creds.web.client_id, creds.web.client_secret, 'postmessage');
      const tokens = await authClient.getToken(request.payload.code);
      if (tokens && tokens.refresh_token) {
        request.auth.credentials.googleCredentials = tokens;
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

  destroy: async function (request, reply) {
    await GSSSync.remove({ _id: request.params.id });
    return reply.response().code(204);
  }
};
