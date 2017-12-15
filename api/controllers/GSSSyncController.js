'use strict';

const Controller = require('trails/controller');
const Boom = require('boom');
const Google = require('googleapis');
const GoogleAuth = require('google-auth-library');
const fs = require('fs');

/**
 * @module GSSSyncController
 * @description Generated Trails.js Controller.
 */
module.exports = class GSSSyncController extends Controller{

  create (request, reply) {
    const GSSSync = this.app.orm.GSSSync;
    const that = this;
    const auth = new GoogleAuth();
    request.payload.user = request.params.currentUser._id;
    if (request.payload.code) {
      const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
      const authClient = new auth.OAuth2(creds.web.client_id, creds.web.client_secret, 'https://api2.dev.humanitarian.id/google/callback');
      authClient.getToken(request.payload.code, function (err, tokens) {
        if (err) {
          console.log(err);
        }
        reply(tokens);
        //authClient.setCredentials(tokens);
        //that._readSpreadsheet(authClient, request.payload.spreadsheet, reply);
      });

    }
    else {
      reply();
    }
    /*GSSSync
      .create(request.payload)
      .then((gsssync) => {
        if (!gsssync) {
          throw Boom.badRequest();
        }
        return reply(gsssync);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });*/
  }

  _readSpreadsheet (auth, spreadsheetId, reply) {
    const sheets = Google.sheets('v4');
    sheets.spreadsheets.values.get({
      auth: auth,
      spreadsheetId: spreadsheetId,
      range: 'A1:D1',
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      reply(response.values);
    });
  }

  destroy (request, reply) {
    request.params.model = 'gsssync';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
