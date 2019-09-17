const Boom = require('@hapi/boom');
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
      const spreadsheet = await GSSSyncService
        .createSpreadsheet(request.auth.credentials, request.payload.list);
      logger.info(
        '[GSSSyncController->create] Created a Google Spreadsheet for synchronization with a list',
        { list: request.payload.list },
      );
      request.payload.spreadsheet = spreadsheet.data.spreadsheetId;
      request.payload.sheetId = spreadsheet.data.sheets[0].properties.sheetId;
    }
    const gsssync = await GSSSync.create(request.payload);
    if (!gsssync) {
      logger.warn(
        '[GSSSyncController->create] Could not create GSSSync',
        { request: request.payload },
      );
      throw Boom.badRequest();
    }
    logger.info(
      '[GSSSyncController->create] Created a GSSSync',
      { gsssync: request.payload },
    );
    await GSSSyncService.synchronizeAll(gsssync);
    logger.info(
      '[GSSSyncController->create] Synchronized gsssync',
      { gsssync: request.payload },
    );
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
        await request.auth.credentials.save();
        logger.info(
          '[GSSSyncController->saveGoogleCredentials] Saved Google credentials',
          { user: request.auth.email },
        );
        return reply.response().code(204);
      }
      logger.warn(
        '[GSSSyncController->saveGoogleCredentials] Missing refresh token when saving Google credentials',
      );
      throw Boom.badRequest('No refresh token');
    } else {
      logger.warn(
        '[GSSSyncController->saveGoogleCredentials] Could not save Google credentials: no code provided',
      );
      throw Boom.badRequest();
    }
  },

  /**
   * Removes the synchronization between a list
   * and a Google spreadsheet.
   */
  async destroy(request, reply) {
    await GSSSync.remove({ _id: request.params.id });
    logger.info(
      `[GSSSyncController->destroy] Removed GSSSync ${request.params.id}`,
    );
    return reply.response().code(204);
  },
};
