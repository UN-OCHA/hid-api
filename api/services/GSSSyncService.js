'use strict';

const Service = require('trails/service');
const fs = require('fs');
const GoogleAuth = require('google-auth-library');
const Google = require('googleapis');
const Boom = require('boom');

/**
 * @module GSSSyncService
 * @description GSSSync Service
 */
module.exports = class GSSSyncService extends Service {

  getAuthClient () {
    // Authenticate with Google
    const auth = new GoogleAuth();
    const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
    const authClient = new auth.OAuth2(creds.web.client_id, creds.web.client_secret, 'postmessage');
    authClient.credentials = this.user.googleCredentials;
    return authClient;
  }

  deleteUser (gsssync, hid) {
    const sheets = Google.sheets('v4');
    let authClient = {};
    return gsssync
      .populate('list user')
      .execPopulate()
      .then(gsssync => {
        authClient = gsssync.getAuthClient();
        return sheets.spreadsheets.values.get({
          spreadsheetId: gsssync.spreadsheet,
          range: 'A:A',
          auth: authClient
        }, function (err, column) {
          let row = 0, index = 0;
          column.values.forEach(function (elt) {
            if (elt[0] === hid) {
              index = row;
            }
            row++;
          });
          if (index !== 0) {
            let body = {
              requests: [{
                deleteDimension: {
                  range: {
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

  writeUser (gsssync, authClient, user, index) {
    const sheets = Google.sheets('v4');
    let values = this.getRowFromUser(user);
    let body = {
      values: [values]
    };
    sheets.spreadsheets.values.update({
      spreadsheetId: gsssync.spreadsheet,
      range: 'A' + index + ':M' + index,
      valueInputOption: 'RAW',
      resource: body,
      auth: authClient
    });
  }

  addUser (gsssync, user) {
    const User = this.app.orm.User;
    const GSSSync = this.app.orm.GSSSync;
    const that = this;
    const sheets = Google.sheets('v4');
    let authClient = {};
    return gsssync
      .populate('list user')
      .execPopulate()
      .then(gsssync => {
        authClient = gsssync.getAuthClient();
        // Find users
        const criteria = gsssync.getUserCriteria();
        if (Object.keys(criteria).length === 0) {
          throw Boom.unauthorized('You are not authorized to view this list');
        }
        return User
          .find(criteria)
          .select(GSSSync.getUserAttributes())
          .sort('name')
          .lean();
      })
      .then(users => {
        return sheets.spreadsheets.values.get({
          spreadsheetId: gsssync.spreadsheet,
          range: 'A:A',
          auth: authClient
        }, function (err, column) {
          let row = 0, index = 0;
          column.values.forEach(function (elt) {
            if (elt[0] !== 'Humanitarian ID' && elt[0] !== users[row - 1]._id.toString() && index === 0) {
              index = row;
            }
            row++;
          });
          if (index !== 0) {
            let body = {
              requests: [{
                insertDimension: {
                  range: {
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
            }, function (err, response) {
              if (!err) {
                const writeIndex = index + 1;
                that.writeUser(gsssync, authClient, user, writeIndex);
              }
            });
          }
          else {
            throw Boom.badRequest('Could not add user');
          }
        });
      });
  }

  findByList(listId) {
    const GSSSync = this.app.orm.GSSSync;
    const that = this;

    return GSSSync
      .find({list: listId});
  }

  addUserToSpreadsheets(listId, user) {
    const that = this;
    return this
      .findByList(listId)
      .then(gsssyncs => {
        if (gsssyncs.length) {
          const fn = function (gsssync) {
            return that.addUser(gsssync, user);
          };
          const actions = gsssyncs.map(fn);
          return Promise.all(actions);
        }
      });
  }

  deleteUserFromSpreadsheets(listId, hid) {
    const that = this;
    return this
      .findByList(listId)
      .then(gsssyncs => {
        if (gsssyncs.length) {
          const fn = function (gsssync) {
            return that.deleteUser(gsssync, hid);
          };
          const actions = gsssyncs.map(fn);
          return Promise.all(actions);
        }
      });
  }

  getRowFromUser (elt) {
    let organization = elt.organization ? elt.organization.name : '',
      country = '',
      region = '',
      skype = '',
      bundles = '',
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
      return [
        elt._id,
        elt.given_name,
        elt.family_name,
        elt.job_title,
        organization,
        bundles,
        roles,
        country,
        region,
        elt.phone_number,
        skype,
        elt.email,
        elt.status
      ];
  }

  synchronizeUser (user) {
    // Get all lists from user
    const listIds = user.getListIds();
    const GSSSync = this.app.orm.GSSSync;
    const that = this;

    // Find the gsssyncs associated to the lists
    return GSSSync
      .find({list: {$in: listIds}})
      .then(gsssyncs => {
        if (gsssyncs.length) {
          // For each gsssync, call updateUser
          const fn = function (gsssync) {
            return that.updateUser(gsssync, user);
          };
          const actions = gsssyncs.map(fn);
          return Promise.all(actions);
        }
      })
      .then(values => {
        return user;
      });
  }

  updateUser (gsssync, user) {
    const sheets = Google.sheets('v4');
    const that = this;
    let authClient = {};
    return gsssync
      .populate('list user')
      .execPopulate()
      .then(gsssync => {
        authClient = gsssync.getAuthClient();
        return sheets.spreadsheets.values.get({
          spreadsheetId: gsssync.spreadsheet,
          range: 'A:A',
          auth: authClient
        }, function (err, column) {
          let row = 0, index = 0;
          column.values.forEach(function (elt) {
            if (elt[0] === user._id.toString()) {
              index = row;
            }
            row++;
          });
          if (index !== 0) {
            that.writeUser(gsssync, authClient, user, index);
          }
          else {
            throw Boom.badRequest('Could not find user');
          }
        });
      });
  }

  synchronizeAll (gsssync) {
    const User = this.app.orm.User;
    const GSSSync = this.app.orm.GSSSync;
    const headers = GSSSync.getSpreadsheetHeaders();
    const that = this;
    let authClient = {};
    return gsssync
      .populate('list user')
      .execPopulate()
      .then(gsssync => {
        authClient = gsssync.getAuthClient();
        return gsssync;
      })
      .then(gsssync => {
        const criteria = gsssync.getUserCriteria();
        if (Object.keys(criteria).length === 0) {
          throw Boom.unauthorized('You are not authorized to view this list');
        }
        return User
          .find(criteria)
          .select(GSSSync.getUserAttributes())
          .sort('name')
          .lean();
      })
      .then((users) => {
        // Export users to spreadsheet
        let data = [];
        let index = 2;
        let row = [];
        data.push({
          range: 'A1:M1',
          values: [headers]
        });
        users.forEach(function (elt) {
          row = that.getRowFromUser(elt);
          data.push({
            range: 'A' + index + ':M' + index,
            values: [row]
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

};
