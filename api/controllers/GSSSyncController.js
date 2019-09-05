

const Boom = require('boom');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const GSSSync = require('../models/GSSSync');
const GSSSyncService = require('../services/GSSSyncService');
const config = require('../../config/env')[process.env.NODE_ENV];

const { logger } = config;

/**
 * @module GSSSyncController
 * @description Handles the synchronization of lists with google spreadsheets.
 */

module.exports = {

  /**
   * Create a synchronization between a list and a Google spreadsheet.
   */
  async create(request) {
    request.payload.user = request.auth.credentials._id;
    if (!request.payload.spreadsheet) {
      logger.info(
        '[GSSSyncController->create] Creating a Google Spreadsheet for synchronization with a list',
        { list: request.payload.list }
      );
      const spreadsheet = await GSSSyncService
        .createSpreadsheet(request.auth.credentials, request.payload.list);
      request.payload.spreadsheet = spreadsheet.data.spreadsheetId;
      request.payload.sheetId = spreadsheet.data.sheets[0].properties.sheetId;
    }
    const gsssync = await GSSSync.create(request.payload);
    if (!gsssync) {
      logger.warn(
        '[GSSSyncController->create] Could not create GSSSync',
        { request: request.payload }
      );
      throw Boom.badRequest();
    }
    await GSSSyncService.synchronizeAll(gsssync);
    return gsssync;
  },

  /**
   * Save Google access and refresh tokens to allow HID to access a spreadsheet
   * in the provided Google account.
   */
  async saveGoogleCredentials(request, reply) {
    if (request.payload.code) {
      const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
      const authClient = new OAuth2Client(creds.web.client_id, creds.web.client_secret, 'postmessage');
      const tokens = await authClient.getToken(request.payload.code);
      if (tokens && tokens.refresh_token) {
        request.auth.credentials.googleCredentials = tokens;
        logger.info(
          '[GSSSyncController->saveGoogleCredentials] Saving Google credentials',
          { user: request.auth.email }
        );
        await request.auth.credentials.save();
        return reply.response().code(204);
      }
      logger.warn(
        '[GSSSyncController->saveGoogleCredentials] Missing refresh token when saving Google credentials'
      );
      throw Boom.badRequest('No refresh token');
    } else {
      logger.warn(
        '[GSSSyncController->saveGoogleCredentials] Could not save Google credentials: no code provided'
      );
      throw Boom.badRequest();
    }
  },

  /**
   * Removes the synchronization between a list
   * and a Google spreadsheet.
   */
  async destroy(request, reply) {
    logger.info(
      '[GSSSyncController->destroy] Remove GSSSync ' + request.params.id
    );
    await GSSSync.remove({ _id: request.params.id });
    return reply.response().code(204);
  },
};
