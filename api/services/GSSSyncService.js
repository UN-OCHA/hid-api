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

  getAuthClient (user) {
    // Authenticate with Google
    const auth = new GoogleAuth();
    const creds = JSON.parse(fs.readFileSync('keys/client_secrets.json'));
    const authClient = new auth.OAuth2(creds.web.client_id, creds.web.client_secret, 'postmessage');
    authClient.credentials = user.googleCredentials;
    return authClient;
  }

  deleteUser (gsssync, hid) {
    const ErrorService = this.app.services.ErrorService;
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
          if (err) {
            if (err.code === 404) {
              // Spreadsheet has been deleted, remove the synchronization
              gsssync.remove();
            }
            return ErrorService.handleWithoutReply(err);
          }
          if (!column || !column.values) {
            throw Boom.badImplementation('column or column.values is undefined on spreadsheet ' + gsssync.spreadsheet);
          }
          let row = 0, index = 0;
          column.values.forEach(function (elt) {
            if (elt[0] === hid) {
              index = row;
            }
            row++;
          });
          if (index !== 0) {
            const body = {
              requests: [{
                deleteDimension: {
                  range: {
                    sheetId: gsssync.sheetId,
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
    const ErrorService = this.app.services.ErrorService;
    const sheets = Google.sheets('v4');
    const values = this.getRowFromUser(user);
    const body = {
      values: [values]
    };
    sheets.spreadsheets.values.update({
      spreadsheetId: gsssync.spreadsheet,
      range: 'A' + index + ':M' + index,
      valueInputOption: 'RAW',
      resource: body,
      auth: authClient
    }, function (err, response) {
      if (err) {
        if (err.code === 404) {
          // Spreadsheet has been deleted, remove the synchronization
          gsssync.remove();
        }
        return ErrorService.handleWithoutReply(err);
      }
    });
  }

  addUser (gsssync, user) {
    const User = this.app.orm.User;
    const GSSSync = this.app.orm.GSSSync;
    const ErrorService = this.app.services.ErrorService;
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
          if (err) {
            if (err.code === 404) {
              // Spreadsheet has been deleted, remove the synchronization
              gsssync.remove();
            }
            return ErrorService.handleWithoutReply(err);
          }
          if (!column || !column.values) {
            throw Boom.badImplementation('column or column.values is undefined on spreadsheet ' + gsssync.spreadsheet);
          }
          let row = 0, index = 0, firstLine = true;
          column.values.forEach(function (elt) {
            // Skip first line as it's the headers
            if (firstLine === true) {
              firstLine = false;
            }
            else {
              if (elt[0] !== users[row]._id.toString() && index === 0) {
                index = row + 1;
              }
              row++;
            }
          });
          if (index !== 0) {
            const body = {
              requests: [{
                insertDimension: {
                  range: {
                    sheetId: gsssync.sheetId,
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
    const organization = elt.organization ? elt.organization.name : '';
    let country = '',
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
    const ErrorService = this.app.services.ErrorService;
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
          if (err) {
            if (err.code === 404) {
              // Spreadsheet has been deleted, remove the synchronization
              gsssync.remove();
            }
            return ErrorService.handleWithoutReply(err);
          }
          if (!column || !column.values) {
            throw Boom.badImplementation('column or column.values is undefined on spreadsheet ' + gsssync.spreadsheet);
          }
          let row = 0, index = 0;
          column.values.forEach(function (elt) {
            if (elt[0] === user._id.toString()) {
              index = row + 1;
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

  createSpreadsheet (user, listId, callback) {
    const List = this.app.orm.List;
    List
      .findOne({ _id: listId })
      .then(list => {
        if (!list) {
          return callback(new Error('List not found'));
        }
        const authClient = this.getAuthClient(user);
        const sheets = Google.sheets('v4');
        let request = {
          resource: {
            properties: {
              title: list.name
            },
            sheets: [{
              properties: {
                gridProperties: {
                  rowCount: 10000
                }
              }
            }]
          },
          auth: authClient
        };
        sheets.spreadsheets.create(request, function (err, response) {
          if (err) {
            return callback(err);
          }
          callback(null, response);
        });
      })
      .catch(err => {
        return callback(err);
      });
  }

  getSheetId (gsssync, callback) {
    gsssync
      .populate('user')
      .execPopulate()
      .then(() => {
        const authClient = gsssync.getAuthClient();
        const sheets = Google.sheets('v4');
        sheets.spreadsheets.get({
          spreadsheetId: gsssync.spreadsheet,
          auth: authClient
        }, function (err, sheet) {
          callback(sheet.sheets[0].properties.sheetId);
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
        const data = [];
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
        const body = {
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
