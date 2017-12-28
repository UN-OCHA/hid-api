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
    let gsync = {};
    request.payload.user = request.params.currentUser._id;
    GSSSync
      .create(request.payload)
      .then((gsssync) => {
        if (!gsssync) {
          throw Boom.badRequest();
        }
        gsync = gsssync;
        return that._syncSpreadsheet(gsssync);
      })
      .then((resp) => {
        reply (gsync);
      })
      .catch(err => {
        that.app.services.ErrorService.handle(err, request, reply);
      });
  }

  _findByList(listId) {
    const GSSSync = this.app.orm.GSSSync;
    const that = this;

    return GSSSync
      .find({list: listId});
  }

  _deleteUserFromSpreadsheets(listId, hid) {
    const that = this;
    return this
      ._findByList(listId)
      .then(gsssyncs => {
        if (gsssyncs.length) {
          const fn = function (gsssync) {
            return that._deleteUser(gsssync, hid);
          };
          const actions = gsssyncs.map(fn);
          return Promise.all(actions);
        }
      });
  }

  _deleteUser (gsssync, hid) {
    const sheets = Google.sheets('v4');
    let authClient = {};
    return gsssync
      .populate('list user')
      .execPopulate()
      .then(gsssync => {
        // Authenticate with Google
        const auth = new GoogleAuth();
        const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
        authClient = new auth.OAuth2(creds.web.client_id, creds.web.client_secret, 'postmessage');
        authClient.credentials = gsssync.user.googleCredentials;
        return gsssync;
      })
      .then(gsssync => {
        return sheets.spreadsheets.values.get({
          spreadsheetId: gsssync.spreadsheet,
          range: 'A:A',
          auth: authClient
        }, function (err, column) {
          let row = 0, index = 0;
          column.values.forEach(function (elt) {
            if (elt === hid) {
              index = row;
            }
            row++;
          });
          if (index !== 0) {
            let body = {
              requests: [{
                deleteDimension: {
                  range: {
                    //sheetId: 1,
                    dimension: 'ROWS',
                    startIndex: index,
                    endIndex: index + 1
                  }
                }
              }]
            };
            sheets.spreadsheets.batchUpdate({
              spreadsheetId: gsssync.spreadsheet,
              resource: body,
              auth: authClient
            });
          }
          else {
            throw Boom.badRequest('Could not find user');
          }
        });
      });
  }

  _syncSpreadsheet (gsssync) {
    const User = this.app.orm.User;
    let authClient = {};
    return gsssync
      .populate('list user')
      .execPopulate()
      .then(gsssync => {
        // Authenticate with Google
        const auth = new GoogleAuth();
        const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
        authClient = new auth.OAuth2(creds.web.client_id, creds.web.client_secret, 'postmessage');
        authClient.credentials = gsssync.user.googleCredentials;
        return gsssync;
      })
      .then(gsssync => {
        // Find users
        const list = gsssync.list;
        let criteria = {};
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
          .sort('name')
          .lean();
      })
      .then((users) => {
        // Export users to spreadsheet
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
          if (elt.voips && elt.voips.length) {
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
            values: [[elt._id , elt.given_name, elt.family_name, elt.job_title, organization, bundles, roles, country, region, elt.phone_number, skype, elt.email, elt.status]]
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
          resource: body,
          auth: authClient
        });
      });
  }

  saveGoogleCredentials (request, reply) {
    const that = this;
    const OAuth2 = Google.auth.OAuth2;
    if (request.payload.code) {
      const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
      const authClient = new OAuth2(creds.web.client_id, creds.web.client_secret, 'postmessage');
      authClient
        .getToken(request.payload.code, function (err, tokens) {
          if (err || !tokens) {
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
