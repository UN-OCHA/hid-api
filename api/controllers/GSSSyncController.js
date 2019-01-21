'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const {google} = require('googleapis');
const {OAuth2Client} = require('google-auth-library');
const fs = require('fs');

/**
 * @module GSSSyncController
 * @description Generated Trails.js Controller.
 */
module.exports = class GSSSyncController extends Controller{

  createHelper (request, reply) {
    const GSSSync = this.app.orm.GSSSync;
    const GSSSyncService = this.app.services.GSSSyncService;
    const that = this;
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
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  create (request, reply) {
    const GSSSyncService = this.app.services.GSSSyncService;
    const that = this;
    request.payload.user = request.params.currentUser._id;
    if (!request.payload.spreadsheet) {
      GSSSyncService.createSpreadsheet(request.params.currentUser, request.payload.list, function (err, spreadsheet) {
        if (err) {
          return that.app.services.ErrorService.handle(err, request, reply);
        }
        request.payload.spreadsheet = spreadsheet.data.spreadsheetId;
        request.payload.sheetId = spreadsheet.data.sheets[0].properties.sheetId;
        that.createHelper(request, reply);
      });
    }
    else {
      this.createHelper(request, reply);
    }
  }

  saveGoogleCredentials (request, reply) {
    const that = this;
    if (request.payload.code) {
      const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
      const authClient = new OAuth2Client(creds.web.client_id, creds.web.client_secret, 'postmessage');
      authClient
        .getToken(request.payload.code, function (err, tokens) {
          if (err) {
            return that.app.services.ErrorService.handle(err, request, reply);
          }
          if (tokens && tokens.refresh_token) {
            request.params.currentUser.googleCredentials = tokens;
            request.params.currentUser.save();
            reply().code(204);
          }
          else {
            const noRefreshToken = Boom.badRequest('No refresh token');
            that.app.services.ErrorService.handle(noRefreshToken, request, reply);
          }
        });
    }
    else {
      return reply(Boom.badRequest());
    }
  }

  destroy (request, reply) {
    request.params.model = 'gsssync';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
