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
    const OAuth2 = Google.auth.OAuth2;
    request.payload.user = request.params.currentUser._id;
    if (request.payload.code) {
      const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
      const authClient = new OAuth2(creds.web.client_id, creds.web.client_secret, 'postmessage');
      authClient
        .getToken(request.payload.code, function (err, tokens) {
          if (err) {
            return that.app.services.ErrorService.handle(err, request, reply);
          }
          delete request.payload.code;
          if (tokens && tokens.refresh_token) {
            request.params.currentUser.googleCredentials = tokens;
            return request.params.currentUser.save();
          }
        })
        .then((tokens) => {
          delete request.payload.code;
          if (tokens && tokens.refresh_token) {
            request.params.currentUser.googleCredentials = tokens;
            return request.params.currentUser.save();
          }
        })
        .then(() => {
          return GSSSync.create(request.payload);
        })
        .then((gsssync) => {
          if (!gsssync) {
            throw Boom.badRequest();
          }
          reply(gsssync);
          return that._syncSpreadsheet(gsssync);
        })
        .catch(err => {
          that.app.services.ErrorService.handle(err, request, reply);
        });
    }
    else {
      return reply(Boom.badRequest());
    }
  }

  _syncSpreadsheet (gsssync) {
    const User = this.app.orm.User;
    return gsssync
      .populate('list user')
      .then(gsssync => {
        // Authenticate with Google
        const auth = new GoogleAuth();
        const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
        const authClient = new auth.OAuth2(creds.web.client_id, creds.web.client_secret, 'postmessage');
        authClient.credentials = gsssync.user.googleCredentials;
        return gsssync;
      })
      .then(gsssync => {
        // Find users
        const list = gsssync.list;
        const listType = list.type;
        let criteria = [];
        if (list.isVisibleTo(gsssync.user)) {
          criteria[list.type + 's'] = {$elemMatch: {list: list._id, deleted: false}};
          if (!list.isOwner(gsssync.user)) {
            criteria[list.type + 's'].$elemMatch.pending = false;
          }
        }
        else {
          throw Boom.unauthorized('You are not authorized to view this list');
        }
        return User
          .find(criteria)
          .select('name given_name family_name email job_title phone_number status organization bundles location voips connections phonesVisibility emailsVisibility locationsVisibility createdAt updatedAt is_orphan is_ghost verified isManager is_admin functional_roles')
          .lean();
      })
      .then((users) => {
        // Export users to spreadsheet
        let values = [];
        let data = [];
        let index = 2;
        let organization = '',
          country = '',
          region = '',
          skype = '',
          bundles = '',
          roles = '';
        data.push({
          range: 'A1:M1',
          values: [['Humanitarian ID', 'First Name', 'Last Name', 'Job Title', 'Organization', 'Groups', 'Roles', 'Country', 'Admin Area', 'Phone number', 'Skype', 'Email', 'Notes']]
        });
        users.forEach(function (elt) {
          organization = elt.organization ? elt.organization.name : '';
          country = '';
          region = '';
          skype = '';
          bundles = '';
          roles = '';
          if (elt.location && elt.location.country) {
            country = elt.location.country.name;
          }
          if (elt.location && elt.location.region) {
            region = elt.location.region.name;
          }
          if (elt.voips.length) {
            elt.voips.forEach(function (voip) {
              if (voip.type === 'Skype') {
                skype = voip.username;
              }
            });
          }
          if (elt.bundles && elt.bundles.length) {
            elt.bundles.forEach(function (bundle) {
              bundles += bundle.name + ';';
            });
          }
          if (elt.functional_roles && elt.functional_roles.length) {
            elt.functional_roles.forEach(function (role) {
              roles += role.name + ';';
            });
          }
          data.push({
            range: 'A' + index + ':M' + index,
            values: [[elt.id, elt.given_name, elt.family_name, elt.job_title, organization, bundles, roles, country, region, elt.phone_number, skype, elt.email, elt.status]]
          });
          index++;
        });
        let body = {
          data: data,
          valueInputOption: 'RAW'
        };
        const sheets = Google.sheets('v4');
        return sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: gsssync.spreadsheet,
          resource: body
        });
      });
  }

  destroy (request, reply) {
    request.params.model = 'gsssync';
    const FootprintController = this.app.controllers.FootprintController;
    FootprintController.destroy(request, reply);
  }
};
